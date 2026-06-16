import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.*;
import java.util.regex.*;

public class Server {
    private static final int PORT = 8080;
    private static final String DB_FILE = "database.csv";

    public static void main(String[] args) {
        System.out.println("==========================================");
        System.out.println("      Employee Payroll Management Server  ");
        System.out.println("==========================================");

        // Setup DB file with sample data if it doesn't exist
        DbHandler.initializeDbIfEmpty();

        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
            server.createContext("/", new StaticFileHandler());
            server.createContext("/api/employees", new ApiHandler());

            // Use cached thread pool executor for high performance concurrency
            server.setExecutor(Executors.newCachedThreadPool());

            server.start();
            System.out.println("Server is listening on http://localhost:" + PORT);
            System.out.println("Press Ctrl+C to terminate.");
            System.out.println("------------------------------------------");
        } catch (IOException e) {
            System.err.println("Failed to start server: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // --- EMPLOYEE MODEL ---
    public static class Employee {
        public String id;
        public String name;
        public String email;
        public String department;
        public String designation;
        public String joiningDate;
        public double baseSalary;
        public double allowances;
        public double deductions;
        public double netSalary;
        public String status; // "Paid" or "Pending"

        public Employee() {}

        public Employee(String id, String name, String email, String department, String designation, 
                        String joiningDate, double baseSalary, double allowances, double deductions, 
                        double netSalary, String status) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.department = department;
            this.designation = designation;
            this.joiningDate = joiningDate;
            this.baseSalary = baseSalary;
            this.allowances = allowances;
            this.deductions = deductions;
            this.netSalary = netSalary;
            this.status = status;
        }
    }

    // --- DATABASE HANDLER WITH RW LOCK ---
    public static class DbHandler {
        private static final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

        // Escapes fields for CSV output
        public static String escapeCsv(String text) {
            if (text == null) return "";
            if (text.contains(",") || text.contains("\"")) {
                StringBuilder escaped = new StringBuilder("\"");
                for (int i = 0; i < text.length(); i++) {
                    char c = text.charAt(i);
                    if (c == '"') escaped.append("\"\"");
                    else escaped.append(c);
                }
                escaped.append("\"");
                return escaped.toString();
            }
            return text;
        }

        // Parses a CSV row correctly taking into account quotes and escaped quotes
        public static List<String> parseCsvLine(String line) {
            List<String> row = new ArrayList<>();
            StringBuilder cell = new StringBuilder();
            boolean inQuotes = false;
            for (int i = 0; i < line.length(); i++) {
                char c = line.charAt(i);
                if (c == '"') {
                    if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        cell.append('"');
                        i++; // Skip second quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (c == ',' && !inQuotes) {
                    row.add(cell.toString());
                    cell.setLength(0);
                } else {
                    cell.append(c);
                }
            }
            row.add(cell.toString());
            return row;
        }

        // Load all employees from database.csv
        public static List<Employee> loadEmployees() {
            rwLock.readLock().lock();
            List<Employee> list = new ArrayList<>();
            File file = new File(DB_FILE);
            if (!file.exists()) {
                rwLock.readLock().unlock();
                return list;
            }

            try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
                String line = reader.readLine(); // Skip Header
                if (line == null) {
                    rwLock.readLock().unlock();
                    return list;
                }

                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    List<String> row = parseCsvLine(line);
                    if (row.size() < 11) continue;

                    Employee emp = new Employee();
                    emp.id = row.get(0);
                    emp.name = row.get(1);
                    emp.email = row.get(2);
                    emp.department = row.get(3);
                    emp.designation = row.get(4);
                    emp.joiningDate = row.get(5);
                    try {
                        emp.baseSalary = Double.parseDouble(row.get(6));
                        emp.allowances = Double.parseDouble(row.get(7));
                        emp.deductions = Double.parseDouble(row.get(8));
                        emp.netSalary = Double.parseDouble(row.get(9));
                    } catch (NumberFormatException e) {
                        emp.baseSalary = emp.allowances = emp.deductions = emp.netSalary = 0.0;
                    }
                    emp.status = row.get(10);
                    list.add(emp);
                }
            } catch (IOException e) {
                System.err.println("Error reading database: " + e.getMessage());
            } finally {
                rwLock.readLock().unlock();
            }
            return list;
        }

        // Save employees list to database.csv
        public static void saveEmployees(List<Employee> list) {
            rwLock.writeLock().lock();
            try (PrintWriter writer = new PrintWriter(new BufferedWriter(new FileWriter(DB_FILE, StandardCharsets.UTF_8)))) {
                // Header
                writer.println("id,name,email,department,designation,joiningDate,baseSalary,allowances,deductions,netSalary,status");
                
                for (Employee emp : list) {
                    writer.println(
                        escapeCsv(emp.id) + "," +
                        escapeCsv(emp.name) + "," +
                        escapeCsv(emp.email) + "," +
                        escapeCsv(emp.department) + "," +
                        escapeCsv(emp.designation) + "," +
                        escapeCsv(emp.joiningDate) + "," +
                        emp.baseSalary + "," +
                        emp.allowances + "," +
                        emp.deductions + "," +
                        emp.netSalary + "," +
                        escapeCsv(emp.status)
                    );
                }
            } catch (IOException e) {
                System.err.println("Error writing to database: " + e.getMessage());
            } finally {
                rwLock.writeLock().unlock();
            }
        }

        // Initialize CSV with sample data if it doesn't exist
        public static void initializeDbIfEmpty() {
            File file = new File(DB_FILE);
            boolean shouldInit = false;
            if (!file.exists()) {
                shouldInit = true;
            } else {
                try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                    reader.readLine(); // Header
                    String firstDataLine = reader.readLine();
                    if (firstDataLine == null || firstDataLine.trim().isEmpty()) {
                        shouldInit = true;
                    }
                } catch (IOException e) {
                    shouldInit = true;
                }
            }

            if (shouldInit) {
                System.out.println("Database is empty or missing. Initializing with sample records...");
                List<Employee> sample = Arrays.asList(
                    new Employee("EMP001", "Alice Smith", "alice@company.com", "Engineering", "Software Architect", "2024-03-01", 8500.0, 1500.0, 800.0, 9200.0, "Paid"),
                    new Employee("EMP002", "Bob Jones", "bob@company.com", "Sales", "Account Manager", "2024-05-15", 5000.0, 1200.0, 450.0, 5750.0, "Paid"),
                    new Employee("EMP003", "Charlie Brown", "charlie@company.com", "Human Resources", "HR Manager", "2023-11-10", 6000.0, 800.0, 500.0, 6300.0, "Pending"),
                    new Employee("EMP004", "Diana Prince", "diana@company.com", "Marketing", "Design Lead", "2025-01-20", 7000.0, 1100.0, 600.0, 7500.0, "Paid")
                );
                saveEmployees(sample);
            }
        }
    }

    // --- JSON PARSER & UTILITIES ---
    public static class JsonUtil {
        
        // Regex-based flat JSON string parser supporting escaped quotes
        public static Map<String, String> parseJson(String json) {
            Map<String, String> map = new HashMap<>();
            if (json == null || json.trim().isEmpty()) return map;

            // Pattern finds "key" : "value" (with string escapes) OR "key" : number/boolean/null
            Pattern pattern = Pattern.compile("\"((?:[^\"\\\\]|\\\\.)*)\"\\s*:\\s*(?:\"((?:[^\"\\\\]|\\\\.)*)\"|([0-9.-]+|true|false|null))");
            Matcher matcher = pattern.matcher(json);

            while (matcher.find()) {
                String key = unescapeJsonString(matcher.group(1));
                String valStr = matcher.group(2);
                if (valStr != null) {
                    valStr = unescapeJsonString(valStr);
                } else {
                    valStr = matcher.group(3); // handles unquoted numbers/booleans/nulls
                }
                map.put(key, valStr);
            }
            return map;
        }

        private static String unescapeJsonString(String str) {
            if (str == null) return null;
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < str.length(); i++) {
                char c = str.charAt(i);
                if (c == '\\' && i + 1 < str.length()) {
                    char next = str.charAt(i + 1);
                    switch (next) {
                        case '"': sb.append('"'); break;
                        case '\\': sb.append('\\'); break;
                        case '/': sb.append('/'); break;
                        case 'b': sb.append('\b'); break;
                        case 'f': sb.append('\f'); break;
                        case 'n': sb.append('\n'); break;
                        case 'r': sb.append('\r'); break;
                        case 't': sb.append('\t'); break;
                        default: sb.append(next);
                    }
                    i++;
                } else {
                    sb.append(c);
                }
            }
            return sb.toString();
        }

        private static String escapeJson(String str) {
            if (str == null) return "";
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < str.length(); i++) {
                char c = str.charAt(i);
                switch (c) {
                    case '"': sb.append("\\\""); break;
                    case '\\': sb.append("\\\\"); break;
                    case '\n': sb.append("\\n"); break;
                    case '\r': sb.append("\\r"); break;
                    case '\t': sb.append("\\t"); break;
                    default: sb.append(c);
                }
            }
            return sb.toString();
        }

        public static String toJson(Employee emp) {
            return "{" +
                "\"id\":\"" + escapeJson(emp.id) + "\"," +
                "\"name\":\"" + escapeJson(emp.name) + "\"," +
                "\"email\":\"" + escapeJson(emp.email) + "\"," +
                "\"department\":\"" + escapeJson(emp.department) + "\"," +
                "\"designation\":\"" + escapeJson(emp.designation) + "\"," +
                "\"joiningDate\":\"" + escapeJson(emp.joiningDate) + "\"," +
                "\"baseSalary\":" + emp.baseSalary + "," +
                "\"allowances\":" + emp.allowances + "," +
                "\"deductions\":" + emp.deductions + "," +
                "\"netSalary\":" + emp.netSalary + "," +
                "\"status\":\"" + escapeJson(emp.status) + "\"" +
                "}";
        }

        public static String toJsonList(List<Employee> list) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                sb.append(toJson(list.get(i)));
                if (i + 1 < list.size()) {
                    sb.append(",");
                }
            }
            sb.append("]");
            return sb.toString();
        }
    }

    // --- STATIC FILE SERVER HANDLER ---
    public static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            
            // Map root request to index.html
            if (path.equals("/") || path.equals("/index.html")) {
                path = "/index.html";
            }

            // Prevent path traversal attacks
            if (path.contains("..")) {
                sendResponse(exchange, 403, "text/plain", "403 Forbidden");
                return;
            }

            File file = new File("public" + path);
            if (!file.exists() || file.isDirectory()) {
                System.out.println("File not found: " + file.getPath());
                sendResponse(exchange, 404, "text/html", "<h1>404 Not Found</h1><p>The requested URL was not found on this server.</p>");
                return;
            }

            // Read the static file bytes
            byte[] fileBytes = Files.readAllBytes(file.toPath());
            String contentType = getMimeType(path);

            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(200, fileBytes.length);
            
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(fileBytes);
            }
        }

        private String getMimeType(String path) {
            String lower = path.toLowerCase();
            if (lower.endsWith(".html")) return "text/html; charset=utf-8";
            if (lower.endsWith(".css")) return "text/css; charset=utf-8";
            if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            return "application/octet-stream";
        }
    }

    // --- REST API CONTROLLER HANDLER ---
    public static class ApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();
            System.out.println("[" + method + "] " + exchange.getRequestURI().toString());

            // Handle preflight OPTIONS request
            if (method.equals("OPTIONS")) {
                sendResponse(exchange, 200, "text/plain", "");
                return;
            }

            try {
                if (method.equals("GET")) {
                    List<Employee> list = DbHandler.loadEmployees();
                    String json = JsonUtil.toJsonList(list);
                    sendResponse(exchange, 200, "application/json", json);
                } 
                else if (method.equals("POST")) {
                    String body = readBody(exchange);
                    Map<String, String> payload = JsonUtil.parseJson(body);

                    Employee emp = new Employee();
                    emp.id = payload.getOrDefault("id", "").trim();
                    emp.name = payload.getOrDefault("name", "").trim();
                    emp.email = payload.getOrDefault("email", "").trim();
                    emp.department = payload.getOrDefault("department", "").trim();
                    emp.designation = payload.getOrDefault("designation", "").trim();
                    emp.joiningDate = payload.getOrDefault("joiningDate", "").trim();
                    
                    try {
                        emp.baseSalary = Double.parseDouble(payload.getOrDefault("baseSalary", "0"));
                        emp.allowances = Double.parseDouble(payload.getOrDefault("allowances", "0"));
                        emp.deductions = Double.parseDouble(payload.getOrDefault("deductions", "0"));
                    } catch (NumberFormatException e) {
                        emp.baseSalary = emp.allowances = emp.deductions = 0.0;
                    }
                    emp.netSalary = emp.baseSalary + emp.allowances - emp.deductions;
                    emp.status = payload.getOrDefault("status", "Pending").trim();
                    if (emp.status.isEmpty()) emp.status = "Pending";

                    if (emp.id.isEmpty()) {
                        sendResponse(exchange, 400, "application/json", "{\"error\":\"Employee ID cannot be empty\"}");
                        return;
                    }

                    List<Employee> list = DbHandler.loadEmployees();
                    boolean exists = false;
                    for (Employee existing : list) {
                        if (existing.id.equalsIgnoreCase(emp.id)) {
                            exists = true;
                            break;
                        }
                    }

                    if (exists) {
                        sendResponse(exchange, 400, "application/json", "{\"error\":\"Employee with this ID already exists\"}");
                    } else {
                        list.add(emp);
                        DbHandler.saveEmployees(list);
                        sendResponse(exchange, 201, "application/json", JsonUtil.toJson(emp));
                    }
                } 
                else if (method.equals("PUT")) {
                    String body = readBody(exchange);
                    Map<String, String> payload = JsonUtil.parseJson(body);
                    String targetId = payload.getOrDefault("id", "").trim();

                    if (targetId.isEmpty()) {
                        sendResponse(exchange, 400, "application/json", "{\"error\":\"Missing employee ID in update payload\"}");
                        return;
                    }

                    List<Employee> list = DbHandler.loadEmployees();
                    boolean found = false;
                    Employee updatedEmp = null;

                    for (Employee emp : list) {
                        if (emp.id.equalsIgnoreCase(targetId)) {
                            emp.name = payload.getOrDefault("name", emp.name).trim();
                            emp.email = payload.getOrDefault("email", emp.email).trim();
                            emp.department = payload.getOrDefault("department", emp.department).trim();
                            emp.designation = payload.getOrDefault("designation", emp.designation).trim();
                            emp.joiningDate = payload.getOrDefault("joiningDate", emp.joiningDate).trim();
                            
                            try {
                                emp.baseSalary = Double.parseDouble(payload.getOrDefault("baseSalary", String.valueOf(emp.baseSalary)));
                                emp.allowances = Double.parseDouble(payload.getOrDefault("allowances", String.valueOf(emp.allowances)));
                                emp.deductions = Double.parseDouble(payload.getOrDefault("deductions", String.valueOf(emp.deductions)));
                            } catch (NumberFormatException e) {
                                // Keep old values on invalid format
                            }
                            emp.netSalary = emp.baseSalary + emp.allowances - emp.deductions;
                            emp.status = payload.getOrDefault("status", emp.status).trim();
                            
                            updatedEmp = emp;
                            found = true;
                            break;
                        }
                    }

                    if (found) {
                        DbHandler.saveEmployees(list);
                        sendResponse(exchange, 200, "application/json", JsonUtil.toJson(updatedEmp));
                    } else {
                        sendResponse(exchange, 404, "application/json", "{\"error\":\"Employee not found\"}");
                    }
                } 
                else if (method.equals("DELETE")) {
                    String query = exchange.getRequestURI().getQuery();
                    String targetId = getQueryParam(query, "id");

                    if (targetId.isEmpty()) {
                        sendResponse(exchange, 400, "application/json", "{\"error\":\"Missing query parameter id\"}");
                        return;
                    }

                    List<Employee> list = DbHandler.loadEmployees();
                    Employee toRemove = null;
                    for (Employee emp : list) {
                        if (emp.id.equalsIgnoreCase(targetId)) {
                            toRemove = emp;
                            break;
                        }
                    }

                    if (toRemove != null) {
                        list.remove(toRemove);
                        DbHandler.saveEmployees(list);
                        sendResponse(exchange, 200, "application/json", "{\"success\":true}");
                    } else {
                        sendResponse(exchange, 404, "application/json", "{\"error\":\"Employee not found\"}");
                    }
                } 
                else {
                    sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "application/json", "{\"error\":\"Internal Server Error: " + e.getMessage() + "\"}");
            }
        }

        private String readBody(HttpExchange exchange) throws IOException {
            InputStream is = exchange.getRequestBody();
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int len;
            while ((len = is.read(buffer)) != -1) {
                bos.write(buffer, 0, len);
            }
            return bos.toString(StandardCharsets.UTF_8);
        }

        private String getQueryParam(String query, String key) {
            if (query == null || query.isEmpty()) return "";
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if (idx > 0) {
                    String k = pair.substring(0, idx);
                    String v = pair.substring(idx + 1);
                    if (k.equalsIgnoreCase(key)) {
                        return v;
                    }
                }
            }
            return "";
        }
    }

    // --- REUSABLE UTILITY FOR SENDING RESPONSES ---
    private static void sendResponse(HttpExchange exchange, int statusCode, String contentType, String body) throws IOException {
        byte[] responseBytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        
        // Setup CORS
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");

        if (responseBytes.length > 0) {
            exchange.sendResponseHeaders(statusCode, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } else {
            exchange.sendResponseHeaders(statusCode, -1);
        }
    }
}
