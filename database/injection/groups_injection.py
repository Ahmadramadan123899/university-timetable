import pandas as pd
import psycopg2
import os

from dotenv import load_dotenv
load_dotenv()

# Update your connection info here
conn = psycopg2.connect(
    dbname=os.environ['PG_DB'],
    user=os.environ['PG_USER'],
    password=os.environ['PG_PASSWORD'],
    host=os.environ['PG_HOST'],
    port=os.environ['PG_PORT']
)

cur = conn.cursor()

# Read the CSV file
df = pd.read_csv("data/class_groups.csv")

# Prepare the insert query
insert_query = """
    INSERT INTO class_groups (id, name, year, major, section)
    VALUES (%s, %s, %s, %s, %s)
    ON CONFLICT (id) DO NOTHING  -- remove or change if no conflict handling needed
"""

# Loop through the DataFrame and insert each row
for _, row in df.iterrows():
    cur.execute(
        insert_query,
        (int(row['id']), row['name'], row['year'], row['major'], row['section'])
    )

conn.commit()
cur.close()
conn.close()

print("Data inserted successfully.")
