import firebase_admin
import pulp
from firebase_admin import auth, credentials
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


cred = credentials.Certificate("waldorfwahlen-service-account.json")

# Initialize the Firebase app with the credentials from the service account JSON file
firebase_admin.initialize_app(cred)


# example data
# {"token":"eyJhbGciOiJSUzI1NiIsImtpZCI6IjAyMTAwNzE2ZmRkOTA0ZTViNGQ0OTExNmZmNWRiZGZjOTg5OTk0MDEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vd2FsZG9yZndhaGxlbiIsImF1ZCI6IndhbGRvcmZ3YWhsZW4iLCJhdXRoX3RpbWUiOjE3MjY0MDQ5MDgsInVzZXJfaWQiOiI4VHJxbVpmbU1mWFNjS0xTbW1SelA3MzJiWG0yIiwic3ViIjoiOFRycW1aZm1NZlhTY0tMU21tUnpQNzMyYlhtMiIsImlhdCI6MTcyNjU4Nzk4MywiZXhwIjoxNzI2NTkxNTgzLCJlbWFpbCI6ImpvaGFuLmdyaW1zZWhsQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJqb2hhbi5ncmltc2VobEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.GIZwxuDpvPuH_W8xrzvYa0jxKNJlGllbN0VajkNA4Tqb-tFZJJrVUuQa_bGe9XAw7ZocB2lBKyuatCi93i9fCYdM-NtLE8FSootEF-pt4v8qyvwf1Lz3jP3bjZrrcfLtOi0bL2FvsvqVJFP1PHXh43Eth7SrYOR5z7dbUCMLsqO_VepTYDUeLndmbjRoxLO3beCUUiJN_8jhogxxQ-NWfygUFOVSog8x81KUCTwb21iB5svXXUFJ0zQKwy5bpyfitVW-kgVNnC7kz9cuOPIgSgw6PCiEDN9tZ_QzcrB_KVEshp8ZRASKI4EwDgiEIdC3QQJR1ATUlz1WJirNATVuVA","uid":"8TrqmZfmMfXScKLSmmRzP732bXm2","projects":{"1":{"title":"Project 1","max":3},"2":{"title":"Project 2","max":4},"3":{"title":"Project 3","max":2}},"preferences":{"1":{"name":"Johan","selected":[1,2,3]},"2":{"name":"Sara","selected":[1,2,3]},"3":{"name":"Karl","selected":[1,2,3]},"4":{"name":"Anna","selected":[1,2,3]},"5":{"name":"Eva","selected":[1,2,3]}}}
@app.route("/assign", methods=["POST"])
def assign():
    try:
        data = request.get_json()
        token = data.get("token")
        uid = data.get("uid")

        print(token)

        # Verify the token and UID
        decoded_token = auth.verify_id_token(token)

        print(decoded_token)
        if decoded_token["uid"] == uid:
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
            scores = {"first": 1, "second": 2, "third": 4}

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
                        "points", [scores["first"], scores["second"], scores["third"]]
                    )[0]
                    * x[i, student_preferences[i][0]]
                    + preferences[list(student_ids.keys())[i]].get(
                        "points", [scores["first"], scores["second"], scores["third"]]
                    )[1]
                    * x[i, student_preferences[i][1]]
                    + preferences[list(student_ids.keys())[i]].get(
                        "points", [scores["first"], scores["second"], scores["third"]]
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


if __name__ == "__main__":
    app.run(host="ec2-13-48-226-69.eu-north-1.compute.amazonaws.com", port=5175)
