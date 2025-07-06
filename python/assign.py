import firebase_admin
import pulp
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from firebase_admin import auth, credentials, app_check
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


cred = credentials.Certificate("waldorfwahlen-service-account.json")

# Initialize the Firebase app with the credentials from the service account JSON file
firebase_admin.initialize_app(cred)

def authenticate(token, uid):
    try:
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        # Check if the UID in the token matches the provided UID
        if decoded_token["uid"] == uid:
            return True
        else:
            return False
    except Exception as e:
        return None


def send_email(recipient_emails, subject, body, smtp_config=None):
    """
    Send email using SMTP
    
    Args:
        recipient_emails: List of email addresses or single email address
        subject: Email subject
        body: Email body (HTML supported)
        smtp_config: Dictionary with SMTP configuration
                    {'server': 'smtp.gmail.com', 'port': 587, 'username': 'user@gmail.com', 'password': 'password'}
    
    Returns:
        dict: Success status and message
    """
    try:
        # Default SMTP configuration - can be overridden by environment variables
        if smtp_config is None:
            smtp_config = {
                'server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
                'port': int(os.getenv('SMTP_PORT', 587)),
                'username': os.getenv('SMTP_USERNAME'),
                'password': os.getenv('SMTP_PASSWORD')
            }
        
        # Validate configuration
        if not smtp_config.get('username') or not smtp_config.get('password'):
            return {'success': False, 'message': 'SMTP credentials not configured'}
        
        # Ensure recipient_emails is a list
        if isinstance(recipient_emails, str):
            recipient_emails = [recipient_emails]
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_config['username']
        msg['Subject'] = subject
        
        # Add HTML body
        html_part = MIMEText(body, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Connect to server and send emails
        server = smtplib.SMTP(smtp_config['server'], smtp_config['port'])
        server.starttls()
        server.login(smtp_config['username'], smtp_config['password'])
        
        failed_emails = []
        for email in recipient_emails:
            try:
                msg['To'] = email
                text = msg.as_string()
                server.sendmail(smtp_config['username'], email, text)
                del msg['To']  # Remove To header for next iteration
            except Exception as e:
                failed_emails.append({'email': email, 'error': str(e)})
        
        server.quit()
        
        if failed_emails:
            return {
                'success': False, 
                'message': f'Failed to send {len(failed_emails)} emails',
                'failed_emails': failed_emails,
                'sent_count': len(recipient_emails) - len(failed_emails)
            }
        else:
            return {
                'success': True, 
                'message': f'Successfully sent {len(recipient_emails)} emails',
                'sent_count': len(recipient_emails)
            }
            
    except Exception as e:
        return {'success': False, 'message': f'SMTP Error: {str(e)}'}


def replace_template_variables(template, variables):
    """
    Replace template variables in the format {{variable_name}} with actual values
    
    Args:
        template: String template with variables
        variables: Dictionary of variable name -> value mappings
    
    Returns:
        String with variables replaced
    """
    result = template
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(value))
    return result


@app.before_request
def before_request():
    if request.method == "OPTIONS":
        return "", 200
    app_check_token = request.headers.get("X-Firebase-AppCheck", default="")
    try:
        _ = app_check.verify_token(app_check_token)
        # If verify_token() succeeds, okay to continue to route handler.

    except Exception as e:
        abort(401)



# example data
# {"token":"eyJhbGciOiJSUzI1NiIsImtpZCI6IjAyMTAwNzE2ZmRkOTA0ZTViNGQ0OTExNmZmNWRiZGZjOTg5OTk0MDEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vd2FsZG9yZndhaGxlbiIsImF1ZCI6IndhbGRvcmZ3YWhsZW4iLCJhdXRoX3RpbWUiOjE3MjY0MDQ5MDgsInVzZXJfaWQiOiI4VHJxbVpmbU1mWFNjS0xTbW1SelA3MzJiWG0yIiwic3ViIjoiOFRycW1aZm1NZlhTY0tMU21tUnpQNzMyYlhtMiIsImlhdCI6MTcyNjU4Nzk4MywiZXhwIjoxNzI2NTkxNTgzLCJlbWFpbCI6ImpvaGFuLmdyaW1zZWhsQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJqb2hhbi5ncmltc2VobEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.GIZwxuDpvPuH_W8xrzvYa0jxKNJlGllbN0VajkNA4Tqb-tFZJJrVUuQa_bGe9XAw7ZocB2lBKyuatCi93i9fCYdM-NtLE8FSootEF-pt4v8qyvwf1Lz3jP3bjZrrcfLtOi0bL2FvsvqVJFP1PHXh43Eth7SrYOR5z7dbUCMLsqO_VepTYDUeLndmbjRoxLO3beCUUiJN_8jhogxxQ-NWfygUFOVSog8x81KUCTwb21iB5svXXUFJ0zQKwy5bpyfitVW-kgVNnC7kz9cuOPIgSgw6PCiEDN9tZ_QzcrB_KVEshp8ZRASKI4EwDgiEIdC3QQJR1ATUlz1WJirNATVuVA","uid":"8TrqmZfmMfXScKLSmmRzP732bXm2","projects":{"1":{"title":"Project 1","max":3},"2":{"title":"Project 2","max":4},"3":{"title":"Project 3","max":2}},"preferences":{"1":{"name":"Johan","selected":[1,2,3]},"2":{"name":"Sara","selected":[1,2,3]},"3":{"name":"Karl","selected":[1,2,3]},"4":{"name":"Anna","selected":[1,2,3]},"5":{"name":"Eva","selected":[1,2,3]}}}
@app.route("/assign", methods=["POST"])
def assign():
    try:
        data = request.get_json()
        token = data.get("token")
        uid = data.get("uid")

        
        if authenticate(token, uid):
            # read more data from the request

            # prefences = {studentId (string): {selected: [idProject1, idProject2, ...], points: [number, number, number]},}
            preferences = data.get("preferences")
            print(
                preferences
            )  # => {'1': {'points': [1,2,4], 'selected': [1, 2, 3]}, '2': {'points': [1,2,4], 'selected': [1, 2, 3]}, '3': {'points': [1,2,4], 'selected': [1, 2, 3]}, '4': {'points': [1,2,4], 'selected': [1, 2, 3]}, '5': {'points': [1,2,4], 'selected': [1, 2, 3]}}

            # projects = {projectId: {title: string, max: string}}
            projects = data.get("projects")
            print(
                projects
            )  # => {'1': {'title': 'Project 1', 'max': 3}, '2': {'title': 'Project 2', 'max': 4}, '3': {'title': 'Project 3', 'max': 2}}

            # transform the ids of the students into consistent integers
            student_ids = {}
            for i, student_id in enumerate(preferences.keys()):
                student_ids[student_id] = i

            print(student_ids)  # => {'1': 0, '2': 1, '3': 2, '4': 3, '5': 4}

            # transform the ids of the projects into consistent integers
            project_ids = {}
            for i, project_id in enumerate(projects.keys()):
                project_ids[project_id] = i

            print(project_ids)  # => {'1': 0, '2': 1, '3': 2}

            # transform the preferences into a format that the solver can understand
            student_preferences = []
            for student_id, student in preferences.items():
                student_preferences.append(
                    [project_ids[str(project_id)] for project_id in student["selected"]]
                )

            print(student_preferences)

            # transform the projects into a format that the solver can understand

            project_max = [int(project["max"]) for project in projects.values()]

            print(project_max)

            # create variables for the number of participants and courses
            num_participants = len(student_preferences)
            num_courses = len(project_max)

            print(num_participants, num_courses)

            # create scores
            # scores = {"first": 1, "second": 2, "third": 4}
            scores = [1, 2, 4]

            # create the LP problem
            problem = pulp.LpProblem("CourseAssignment", pulp.LpMinimize)

            # Decision variables: x_ij is 1 if participant i is assigned to course j, otherwise 0
            x = pulp.LpVariable.dicts(
                "x",
                ((i, j) for i in range(num_participants) for j in range(num_courses)),
                cat="Binary",
            )

            # Overbooking variables: o_j is 0 or more if course j is overbooked
            o = pulp.LpVariable.dicts(
                "o", (j for j in range(num_courses)), lowBound=0, cat="Integer"
            )

            # Objective function: Minimize preference scores and overbooking penalties
            problem += pulp.lpSum(
                (
                    preferences[list(student_ids.keys())[i]].get(
                        "points", [scores[0], scores[1], scores[2]]
                    )[0]
                    * x[i, student_preferences[i][0]]
                    + preferences[list(student_ids.keys())[i]].get(
                        "points", [scores[0], scores[1], scores[2]]
                    )[1]
                    * x[i, student_preferences[i][1]]
                    + preferences[list(student_ids.keys())[i]].get(
                        "points", [scores[0], scores[1], scores[2]]
                    )[2]
                    * x[i, student_preferences[i][2]]
                )
                for i in range(num_participants)
            ) + pulp.lpSum(10 * o[j] for j in range(num_courses))

            # Constraint: Each participant is assigned to exactly one course
            for i in range(num_participants):
                problem += pulp.lpSum(x[i, j] for j in range(num_courses)) == 1

            # Constraint: Maximum number of participants per course (with overbooking)
            for j in range(num_courses):
                problem += (
                    pulp.lpSum(x[i, j] for i in range(num_participants))
                    <= project_max[j] + o[j]
                )

            # Preference assignment: Participants can only be assigned to their 1st, 2nd, or 3rd choice
            for i in range(num_participants):
                for j in range(num_courses):
                    if j not in student_preferences[i]:
                        problem += x[i, j] == 0

            # Solve the problem
            problem.solve()

            # Extract the solution
            solution = {}
            for i in range(num_participants):
                for j in range(num_courses):
                    if x[i, j].varValue == 1:
                        solution[list(student_ids.keys())[i]] = list(projects.keys())[j]

            return jsonify(solution)

        else:
            return jsonify({"error": "not authorized"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/users", methods=["GET"])
def users():
    try:
        token = request.args.get("token")
        uid = request.args.get("uid")
        if authenticate(token, uid):
            users = auth.list_users()
            return jsonify([{
                "uid": user.uid,
                "email": user.email,
                "email_verified": user.email_verified,
                "display_name": user.display_name,
                "phone_number": user.phone_number,
                "photo_url": user.photo_url,
                "disabled": user.disabled
            } for user in users.iterate_all()])
        else:
            return jsonify({"error": "not authorized"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/users", methods=["POST"])
def modify_user():
    user_id = request.args.get("user_id")
    if user_id is None:
        print("Creating user")
        try:
            token = request.args.get("token")
            uid = request.args.get("uid")
            if authenticate(token, uid):
                data = request.get_json()

                # Get email and password from the request
                email = data.get("email")
                password = data.get("password")

                user = auth.create_user(email=email, password=password)


                return jsonify(
                    {
                        "uid": user.uid,
                        "email": user.email,
                        "email_verified": user.email_verified,
                        "display_name": user.display_name,
                        "phone_number": user.phone_number,
                        "photo_url": user.photo_url,
                        "disabled": user.disabled,
                    }
                )
            else:
                return jsonify({"error": "not authorized"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        print("Updating user")
        try:
            token = request.args.get("token")
            uid = request.args.get("uid")
            if authenticate(token, uid):
                data = request.get_json()

                # Update disabled status
                disabled = data.get("disabled")

                user = auth.update_user(user_id, disabled=disabled)

                return jsonify(
                    {
                        "uid": user.uid,
                        "email": user.email,
                        "email_verified": user.email_verified,
                        "display_name": user.display_name,
                        "phone_number": user.phone_number,
                        "photo_url": user.photo_url,
                        "disabled": user.disabled,
                    }
                )
            else:
                return jsonify({"error": "not authorized"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/users", methods=["DELETE"])
def delete_user():
    try:
        token = request.args.get("token")
        uid = request.args.get("uid")
        if authenticate(token, uid):
            uid = request.args.get("user_id")
            auth.delete_user(uid)
            return jsonify({"message": "User deleted"})
        else:
            return jsonify({"error": "not authorized"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/send-email", methods=["POST"])
def send_email_endpoint():
    """
    Send emails to a list of recipients
    
    Expected JSON payload:
    {
        "token": "firebase_token",
        "uid": "user_id",
        "emails": ["email1@example.com", "email2@example.com"],
        "subject": "Email subject",
        "body": "Email body with {{variables}}",
        "variables": {"variable_name": "value"},
        "smtp_config": {
            "server": "smtp.gmail.com",
            "port": 587,
            "username": "sender@gmail.com",
            "password": "app_password"
        }
    }
    """
    try:
        data = request.get_json()
        token = data.get("token")
        uid = data.get("uid")
        
        if not authenticate(token, uid):
            return jsonify({"error": "not authorized"}), 401
        
        # Extract email data
        emails = data.get("emails", [])
        subject = data.get("subject", "")
        body_template = data.get("body", "")
        variables = data.get("variables", {})
        smtp_config = data.get("smtp_config")
        
        # Validate required fields
        if not emails:
            return jsonify({"error": "No email addresses provided"}), 400
        
        if not subject or not body_template:
            return jsonify({"error": "Subject and body are required"}), 400
        
        # Replace template variables
        body = replace_template_variables(body_template, variables)
        subject = replace_template_variables(subject, variables)
        
        # Send emails
        result = send_email(emails, subject, body, smtp_config)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="ec2-13-48-226-69.eu-north-1.compute.amazonaws.com", port=5175)
