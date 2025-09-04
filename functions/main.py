import firebase_admin
import pulp
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from firebase_admin import auth, credentials, firestore
from firebase_functions import https_fn, options
from firebase_functions.params import StringParam, IntParam
from datetime import datetime, timedelta, timezone
import logging
import requests

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    firebase_admin.initialize_app()


# Define environment variables
SMTP_DOMAIN = StringParam("SMTP_DOMAIN")
SMTP_PORT = IntParam("SMTP_PORT")
SMTP_USERNAME = StringParam("SMTP_USERNAME")
SMTP_PASSWORD = StringParam("SMTP_PASSWORD")
SENDER_EMAIL = StringParam("SENDER_EMAIL")

def authenticate(token, uid):
    """Verify Firebase ID token and check UID match"""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"] == uid
    except Exception as e:
        return False

def send_email(recipient_emails, subject, body):
    """
    Send email using SMTP with configuration from environment variables.
    
    Args:
        recipient_emails: List of email addresses or single email address
        subject: Email subject
        body: Email body (HTML supported)
    
    Returns:
        dict: Success status and detailed message
    """
    try:
        # Get SMTP configuration from environment variables
        smtp_config = {
            'server': SMTP_DOMAIN.value,
            'port': SMTP_PORT.value,
            'username': SMTP_USERNAME.value,
            'password': SMTP_PASSWORD.value,
            'from_address': SENDER_EMAIL.value
        }

        # Check for missing required fields
        required_fields = ['server', 'port', 'username', 'password', 'from_address']
        missing_fields = [field for field in required_fields if not smtp_config.get(field)]
        
        if missing_fields:
            return {
                'success': False, 
                'message': f'Missing SMTP environment variables: {", ".join(missing_fields)}',
                'error_type': 'missing_config'
            }
        
        if not recipient_emails:
            return {
                'success': False, 
                'message': 'No recipient emails provided',
                'error_type': 'missing_recipients'
            }
        
        if isinstance(recipient_emails, str):
            recipient_emails = [recipient_emails]
        
        # Validate email format
        invalid_emails = [email for email in recipient_emails if '@' not in email or '.' not in email.split('@')[-1]]
        if invalid_emails:
            return {
                'success': False, 
                'message': f'Invalid email format: {", ".join(invalid_emails)}',
                'error_type': 'invalid_email_format'
            }
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_config['from_address']
        msg['Subject'] = subject
        
        html_part = MIMEText(body, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Connect and send
        try:
            server = smtplib.SMTP(smtp_config['server'], int(smtp_config['port']))
            server.starttls()
        except Exception as e:
            return {
                'success': False, 
                'message': f'Failed to connect to SMTP server: {str(e)}',
                'error_type': 'connection_failed'
            }
        
        try:
            server.login(smtp_config['username'], smtp_config['password'])
        except Exception as e:
            server.quit()
            return {
                'success': False, 
                'message': f'SMTP authentication failed: {str(e)}',
                'error_type': 'authentication_failed'
            }
        
        failed_emails = []
        for email in recipient_emails:
            try:
                msg['To'] = email
                text = msg.as_string()
                server.sendmail(smtp_config['from_address'], email, text)
                del msg['To']
            except Exception as e:
                failed_emails.append({
                    'email': email, 
                    'error': str(e),
                    'error_type': 'send_failed'
                })
        
        server.quit()
        
        if failed_emails:
            return {
                'success': len(failed_emails) < len(recipient_emails), 
                'message': f'Sent {len(recipient_emails) - len(failed_emails)} of {len(recipient_emails)} emails',
                'failed_emails': failed_emails,
                'sent_count': len(recipient_emails) - len(failed_emails),
                'total_count': len(recipient_emails)
            }
        else:
            return {
                'success': True, 
                'message': f'Successfully sent all {len(recipient_emails)} emails',
                'sent_count': len(recipient_emails),
                'total_count': len(recipient_emails)
            }
            
    except Exception as e:
        return {
            'success': False, 
            'message': f'Unexpected error: {str(e)}',
            'error_type': 'unexpected_error'
        }

def replace_template_variables(template, variables):
    """Replace template variables in format {{variable_name}} with values"""
    result = template
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(value))
    return result

@https_fn.on_call(
    region="europe-west1",
    max_instances=1,
    cors=options.CorsOptions(
        cors_origins=[r"^http?://([a-zA-Z0-9-]+\.)*localhost(:[0-9]+)?$", r"^https?://([a-zA-Z0-9-]+\.)*beta\.praktikum\.click(:[0-9]+)?$"],
        cors_methods=["POST"]
    )
)
def assign(req: https_fn.CallableRequest) -> dict:
    """Assign students to projects using linear programming"""
    try:
        data = req.data
        token = data.get("token")
        uid = data.get("uid")
        
        if not authenticate(token, uid):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                message="Authentication failed"
            )
        
        preferences = data.get("preferences")
        projects = data.get("projects")
        
        if not preferences or not projects:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Missing preferences or projects data"
            )
        
        # Transform student IDs to consistent integers
        student_ids = {}
        for i, student_id in enumerate(preferences.keys()):
            student_ids[student_id] = i
        
        # Transform project IDs to consistent integers
        project_ids = {}
        for i, project_id in enumerate(projects.keys()):
            project_ids[project_id] = i
        
        # Transform preferences for solver
        student_preferences = []
        for student_id, student in preferences.items():
            student_preferences.append(
                [project_ids[str(project_id)] for project_id in student["selected"]]
            )
        
        # Transform projects for solver
        project_max = [int(project["max"]) for project in projects.values()]
        
        num_participants = len(student_preferences)
        num_courses = len(project_max)
        
        scores = [1, 2, 4]
        
        # Create LP problem
        problem = pulp.LpProblem("CourseAssignment", pulp.LpMinimize)
        
        # Decision variables
        x = pulp.LpVariable.dicts(
            "x",
            ((i, j) for i in range(num_participants) for j in range(num_courses)),
            cat="Binary",
        )
        
        # Overbooking variables
        o = pulp.LpVariable.dicts(
            "o", (j for j in range(num_courses)), lowBound=0, cat="Integer"
        )
        
        # Objective function
        problem += pulp.lpSum(
            (
                preferences[list(student_ids.keys())[i]].get(
                    "points", [scores[0], scores[1], scores[2]]
                )[0] * x[i, student_preferences[i][0]]
                + preferences[list(student_ids.keys())[i]].get(
                    "points", [scores[0], scores[1], scores[2]]
                )[1] * x[i, student_preferences[i][1]]
                + preferences[list(student_ids.keys())[i]].get(
                    "points", [scores[0], scores[1], scores[2]]
                )[2] * x[i, student_preferences[i][2]]
            )
            for i in range(num_participants)
        ) + pulp.lpSum(10 * o[j] for j in range(num_courses))
        
        # Constraints
        for i in range(num_participants):
            problem += pulp.lpSum(x[i, j] for j in range(num_courses)) == 1
        
        for j in range(num_courses):
            problem += (
                pulp.lpSum(x[i, j] for i in range(num_participants))
                <= project_max[j] + o[j]
            )
        
        for i in range(num_participants):
            for j in range(num_courses):
                if j not in student_preferences[i]:
                    problem += x[i, j] == 0
        
        # Solve
        problem.solve()
        
        # Extract solution
        solution = {}
        for i in range(num_participants):
            for j in range(num_courses):
                if x[i, j].varValue == 1:
                    solution[list(student_ids.keys())[i]] = list(projects.keys())[j]
        
        return solution
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=str(e)
        )

@https_fn.on_call(
    region="europe-west1",
    max_instances=1,
    cors=options.CorsOptions(
        cors_origins=[r"^https?://([a-zA-Z0-9-]+\.)*localhost(:[0-9]+)?$", r"^https?://([a-zA-Z0-9-]+\.)*beta\.praktikum\.click(:[0-9]+)?$"],
        cors_methods=["GET", "POST", "DELETE"]
    )
)
def users(req: https_fn.CallableRequest) -> dict:
    """Handle user management operations"""
    try:
        data = req.data
        token = data.get("token")
        uid = data.get("uid")
        operation = data.get("operation", "list")  # list, create, update, delete
        
        if not authenticate(token, uid):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                message="Authentication failed"
            )
        
        claims = auth.verify_id_token(token)
        
        if operation == "list":
            project = data.get("project")
            users_iter = auth.list_users()
            
            if claims.get("role") == "admin":
                all_users = list(users_iter.iterate_all())
                
                if project:
                    filtered_users = [
                        user for user in all_users 
                        if user.custom_claims and user.custom_claims.get("project") == project
                    ]
                    return {"users": [{
                        "uid": user.uid,
                        "email": user.email,
                        "email_verified": user.email_verified,
                        "display_name": user.display_name,
                        "phone_number": user.phone_number,
                        "photo_url": user.photo_url,
                        "disabled": user.disabled,
                        "custom_claims": user.custom_claims
                    } for user in filtered_users]}
                else:
                    return {"users": [{
                        "uid": user.uid,
                        "email": user.email,
                        "email_verified": user.email_verified,
                        "display_name": user.display_name,
                        "phone_number": user.phone_number,
                        "photo_url": user.photo_url,
                        "disabled": user.disabled,
                        "custom_claims": user.custom_claims
                    } for user in all_users]}
            else:
                # Filter by project
                filtered_users = []
                for user in users_iter.iterate_all():
                    if user.custom_claims and user.custom_claims.get("project") == claims["project"]:
                        filtered_users.append(user)
                
                return {"users": [{
                    "uid": user.uid,
                    "email": user.email,
                    "email_verified": user.email_verified,
                    "display_name": user.display_name,
                    "phone_number": user.phone_number,
                    "photo_url": user.photo_url,
                    "disabled": user.disabled,
                    "custom_claims": user.custom_claims
                } for user in filtered_users]}
        
        elif operation == "create":
            email = data.get("email")
            password = data.get("password")
            project = data.get("project")
            
            if not email or not password or not project:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Missing required fields: email, password, or project"
                )
            
            if claims.get("project") == project or claims.get("role") == "admin":
                user = auth.create_user(email=email, password=password)
                auth.set_custom_user_claims(user.uid, {"project": project})
                
                return {
                    "uid": user.uid,
                    "email": user.email,
                    "email_verified": user.email_verified,
                    "display_name": user.display_name,
                    "phone_number": user.phone_number,
                    "photo_url": user.photo_url,
                    "disabled": user.disabled,
                }
            else:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    message="Not authorized to create user for this project"
                )
        
        elif operation == "update":
            user_id = data.get("user_id")
            disabled = data.get("disabled")
            
            if not user_id:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Missing user_id"
                )
            
            mod_claims = auth.get_user(user_id).custom_claims
            if (mod_claims and mod_claims.get("project") == claims.get("project")) or claims.get("role") == "admin":
                user = auth.update_user(user_id, disabled=disabled)
                
                return {
                    "uid": user.uid,
                    "email": user.email,
                    "email_verified": user.email_verified,
                    "display_name": user.display_name,
                    "phone_number": user.phone_number,
                    "photo_url": user.photo_url,
                    "disabled": user.disabled,
                }
            else:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    message="Not authorized to update this user"
                )
        
        elif operation == "delete":
            user_id = data.get("user_id")
            
            if not user_id:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Missing user_id"
                )
            
            mod_claims = auth.get_user(user_id).custom_claims
            if (mod_claims and mod_claims.get("project") == claims.get("project")) or claims.get("role") == "admin":
                auth.delete_user(user_id)
                return {"message": "User deleted"}
            else:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    message="Not authorized to delete this user"
                )
        
        else:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Invalid operation"
            )
            
    except https_fn.HttpsError:
        raise
    except Exception as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=str(e)
        )

@https_fn.on_call(
    region="europe-west1",
    max_instances=1,
    cors=options.CorsOptions(
        cors_origins=[r"^https?://([a-zA-Z0-9-]+\.)*localhost(:[0-9]+)?$", r"^https?://([a-zA-Z0-9-]+\.)*beta\.praktikum\.click(:[0-9]+)?$"],
        cors_methods=["POST"]
    )
)
def send_email_func(req: https_fn.CallableRequest) -> dict:
    """Send emails to recipients with template variable replacement"""
    try:
        data = req.data
        token = data.get("token")
        uid = data.get("uid")
        
        if not token or not uid:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Missing authentication token or user ID"
            )
        
        if not authenticate(token, uid):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                message="Authentication failed"
            )
        
        emails = data.get("emails", [])
        subject = data.get("subject", "")
        body_template = data.get("body", "")
        variables = data.get("variables", {})
        
        if not emails:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="No email addresses provided"
            )
        
        if not subject:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Email subject is required"
            )
            
        if not body_template:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Email body is required"
            )
        
        # Replace template variables
        try:
            body = replace_template_variables(body_template, variables)
            subject = replace_template_variables(subject, variables)
        except Exception as e:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message=f"Failed to process template variables: {str(e)}"
            )
        
        # Send emails
        result = send_email(emails, subject, body)
        
        if not result['success']:
            error_type = result.get('error_type', 'unknown')
            
            if error_type in ['missing_config', 'invalid_config', 'missing_recipients', 'invalid_email_format']:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message=result['message']
                )
            elif error_type in ['authentication_failed']:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                    message=result['message']
                )
            elif error_type in ['connection_failed', 'login_failed']:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.UNAVAILABLE,
                    message=result['message']
                )
            else:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INTERNAL,
                    message=result['message']
                )
        
        return result
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=str(e)
        )
    
@https_fn.on_call(
    region="europe-west1",
    max_instances=1,
    cors=options.CorsOptions(
        cors_origins=[r"^https?://([a-zA-Z0-9-]+\.)*localhost(:[0-9]+)?$", r"^https?://([a-zA-Z0-9-]+\.)*beta\.praktikum\.click(:[0-9]+)?$"],
        cors_methods=["POST"]
    )
)
def submit_vote(req: https_fn.CallableRequest) -> dict:
    """Submit a vote with rate limiting"""
    origin = req.raw_request.headers.get("origin", "unknown")
    # Extract domain from origin, removing protocol if present
    if origin != "unknown":
        # Remove http:// or https:// prefix
        clean_origin = origin.replace("https://", "").replace("http://", "")
        schoolid = clean_origin.split(".")[0]
    else:
        schoolid = None

    if not schoolid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="Cannot determine school ID from host"
        )
    
    try:
        # Initialize Firestore client
        db = firestore.client()

        # Get school reference and document
        school_ref = db.collection("schools").document(schoolid)
        logging.info(f"Fetching document for school ID: {schoolid}")

        school_doc = school_ref.get()

        if not school_doc.exists:
            logging.error(f"School document not found for ID: {schoolid}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message="School not found: " + schoolid
            )
        
            

        school_data = school_doc.to_dict()
        data = req.data


        if school_data.get("oauth", {}).get("enabled") == True:
            logging.info(f"School data retrieved successfully: {school_data}")

            logging.error(f"Request data: {data}")
            access_token = data.get("token")


            if not access_token:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Missing access token"
                )
            
            # Check access token validity through oauth (school_data.oauth) using the userinfo endpoint
            userinfo_url = school_data.get("oauth", {}).get("userInfoEndpoint")
            client_id = school_data.get("oauth", {}).get("clientId")

            if not userinfo_url or not client_id:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                    message="OAuth configuration is incomplete"
                )

            response = requests.get(userinfo_url, headers={
                "Authorization": f"Bearer {access_token}"
            })


            if response.status_code != 200:
                logging.error(f"Failed to fetch user info: {response}")
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                    message="Invalid access token"
                )

            userinfo_data = response.json()

            user_id = userinfo_data.get("sub")
            if not user_id:
                logging.error("User ID (sub) not found in token response")
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                    message="User ID not found in token"
                )
            
        vote_ref = school_ref.collection("votes").document(data.get("voteId"))

        vote_doc = vote_ref.get()
        if not vote_doc.exists:
            logging.error(f"Vote document not found for ID: {data.get('voteId')}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message="Vote not found: " + data.get("voteId")
            )

        vote_data = vote_doc.to_dict()
        if not vote_data.get("active"):
            logging.error(f"Vote is not active: {data.get('voteId')}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="Vote is not active"
            )

        # endTime is {"seconds": 1696118400, "nanoseconds": 0}
        if vote_data.get("endTime") and datetime.now(timezone.utc) > vote_data["endTime"]:
            logging.error(f"Vote has ended: {data.get('voteId')}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="Vote has ended"
            )
        
        # startTime is {"seconds": 1696118400, "nanoseconds": 0}
        if vote_data.get("startTime") and datetime.now(timezone.utc) < vote_data["startTime"]:
            logging.error(f"Vote has not started yet: {data.get('voteId')}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="Vote has not started yet"
            )
        

        # create a new choice document in the choices subcollection
        choice_ref = vote_ref.collection("choices").document()
        choice_data = data.get("choice", {})
        choice_data["timestamp"] = firestore.SERVER_TIMESTAMP
        choice_ref.set(choice_data)

        # Return document ID of the new choice
        return {"choiceId": choice_ref.id}

    except https_fn.HttpsError as e:
        logging.error(f"HttpsError occurred: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error occurred: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=str(e)
        )
