# Employee-payroll-System
The Employee Payroll Management System is a Java-based web application that manages employee payroll records through a RESTful API and a lightweight HTTP server. The system allows administrators to perform CRUD (Create, Read, Update, Delete) operations on employee records while automatically calculating employee salaries and storing data in a CSV.
Project Overview

The system allows organizations to:

Store employee information
Calculate net salary automatically
Add, update, retrieve, and delete employee records
Serve a web-based frontend from static files
Handle multiple client requests concurrently
Persist payroll data in a CSV database

The application follows a simple client-server architecture where:

Backend: Java HTTP Server
Frontend: HTML/CSS/JavaScript files served from the public folder
Database: CSV file (database.csv)

Supported methods:

GET
POST
PUT
DELETE
OPTIONS

Project Architecture
+----------------------+
|   Web Browser        |
| (HTML/CSS/JS UI)     |
+----------+-----------+
           |
           v
+----------------------+
| Java HTTP Server     |
| (HttpServer)         |
+----------+-----------+
           |
   +-------+-------+
   |               |
   v               v
Static Files    REST API
(public/)      /api/employees
                   |
                   v
          +----------------+
          | database.csv   |
          +----------------+
