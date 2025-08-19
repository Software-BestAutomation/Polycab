# db.py
import pyodbc

DB_NAME = "PolycabDB"


def get_master_conn():
    """Connect to the SQL Server master DB (Windows Auth)"""
    return pyodbc.connect(
        "Driver={ODBC Driver 17 for SQL Server};"
        "Server=DESKTOP-7K4CNP4\\SQLEXPRESS;"
        "Database=master;"
        "Trusted_Connection=yes;",
        autocommit=True,
    )


def get_conn():
    """Connect to the application DB (Windows Auth)"""
    return pyodbc.connect(
        "Driver={ODBC Driver 17 for SQL Server};"
        f"Server=DESKTOP-7K4CNP4\\SQLEXPRESS;Database={DB_NAME};"
        "Trusted_Connection=yes;"
    )


def init_db():
    """Create DB and tables (if not exist)"""
    # 1) Create the database
    with get_master_conn() as con:
        cur = con.cursor()
        cur.execute(f"IF DB_ID('{DB_NAME}') IS NULL CREATE DATABASE {DB_NAME}")
        cur.commit()

    # 2) Create tables
    with get_conn() as con:
        cur = con.cursor()
        # Camera settings
        cur.execute(
            """
        IF OBJECT_ID('Camera_Setting') IS NULL
        CREATE TABLE Camera_Setting (
            Camera_ID INT IDENTITY(1,1) PRIMARY KEY,
            Camera_IP NVARCHAR(50),
            Camera_Name NVARCHAR(100),
            Status NVARCHAR(50),
            PTZ_Support BIT,
            Lab_ID INT NULL  -- <--- NEW
        )
        """
        )
        # Lab settings
        cur.execute(
            """
        IF OBJECT_ID('Lab_Setting') IS NULL
        CREATE TABLE Lab_Setting (
            Lab_ID INT IDENTITY(1,1) PRIMARY KEY,
            Lab_name NVARCHAR(100),
            Max_Cameras INT,
            Total_Cameras INT,
            Online_Cameras INT,
            Status NVARCHAR(50),
            Description NVARCHAR(255)
        )
        """
        )
        # Work_Camera_Lab_Detail
        cur.execute(
            """
        IF OBJECT_ID('Work_Camera_Lab_Detail') IS NULL
        CREATE TABLE Work_Camera_Lab_Detail (
            [User] NVARCHAR(100),
            Camera_ID INT,
            Lab_ID INT,
            Date_Time_Stamp DATETIME,
            Screen_View_Indicator CHAR(1),
            Screen_edit_indicator CHAR(1)
        )
        """
        )
        # Session History
        cur.execute(
            """
        IF OBJECT_ID('Session_History') IS NULL
        CREATE TABLE Session_History (
            Session_ID INT IDENTITY(1,1) PRIMARY KEY,
            [User] NVARCHAR(100),
            Camera_ID INT,
            Lab_ID INT,
            Start_Date_Time DATETIME,
            End_Date_Time DATETIME
        )
        """
        )
        con.commit()
