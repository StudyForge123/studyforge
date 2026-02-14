from datetime import datetime, timedelta

# Mock Database
class MemoryDB:
    def __init__(self):
        self.classes = [
            {
                "id": "1",
                "name": "CS 101: Intro to Computer Science",
                "professor": "Dr. Smith",
                "semester": "Fall 2024",
                "nextExamDate": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
                "progress": 0.45,
                "syllabus": None
            },
            {
                "id": "2",
                "name": "MATH 202: Calculus II",
                "professor": "Dr. Jones",
                "semester": "Fall 2024",
                "nextExamDate": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
                "progress": 0.70,
                "syllabus": None
            }
        ]
        self.calendar_events = [
            {"date": datetime.now().strftime("%Y-%m-%d"), "title": "Math Homework Due"},
            {"date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"), "title": "CS Lab 3"},
             {"date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"), "title": "Calculus Midterm"},
        ]

    def get_dashboard_stats(self):
        return {
            "activeClasses": len(self.classes),
            "upcomingDeadlines": 4, # Mock
            "scheduledSessions": 2, # Mock
        }

db = MemoryDB()
