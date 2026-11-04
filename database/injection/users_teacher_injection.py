import pandas as pd
import psycopg2
import os

from dotenv import load_dotenv
load_dotenv()

df = pd.read_csv('data/users_teacher.csv', encoding='utf-8-sig')
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

insert_query = """
    INSERT INTO users (id, name, email, password, role)
    VALUES (%s, %s, %s, %s, %s)
    ON CONFLICT (id) DO NOTHING;
"""

for _, row in df.iterrows():
    cur.execute(
        insert_query,
        (int(row['id']), row['name'], row['email'], row['password'], row['role'])
    )

conn.commit()
cur.close()
conn.close()

print("Users injected successfully.")
