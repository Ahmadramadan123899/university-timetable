import pandas as pd
import psycopg2
import os

from dotenv import load_dotenv
load_dotenv()


df = pd.read_csv('data/students_and_enrollments.csv', encoding='utf-8-sig')
df.columns = df.columns.str.strip()  # Clean up any hidden spaces

print(df.columns)
print(df.head())

conn = psycopg2.connect(
    dbname=os.environ['PG_DB'],
    user=os.environ['PG_USER'],
    password=os.environ['PG_PASSWORD'],
    host=os.environ['PG_HOST'],
    port=os.environ['PG_PORT']
)

cur = conn.cursor()

insert_user = """
    INSERT INTO users (id, name, email, password, role)
    VALUES (%s, %s, %s, %s, %s)
    ON CONFLICT (id) DO NOTHING;
"""

# Insert into student_enrollments table
insert_enrollment = """
    INSERT INTO student_enrollments (student_id, class_group_id, td_group, tp_group)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (student_id, class_group_id) DO NOTHING;
"""

for _, row in df.iterrows():
    # Insert into users
    cur.execute(
        insert_user,
        (int(row['id']), row['name'], row['email'], row['password'], row['role'])
    )
    # Insert into student_enrollments
    cur.execute(
        insert_enrollment,
        (int(row['student_id']), int(row['class_group_id']), row['td_group'], row['tp_group'])
    )

conn.commit()
cur.close()
conn.close()

print("Users and student enrollments injected successfully.")