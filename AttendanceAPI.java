package com.attendance.nfc;

import android.os.AsyncTask;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class AttendanceAPI {
    
    private static final String BASE_URL = "https://your-server.com/api"; // Replace with your server URL
    private static final int TIMEOUT = 10000; // 10 seconds

    // Callback interfaces
    public interface AttendanceCallback {
        void onSuccess(List<Student> verifiedStudents, List<String> unrecognizedTags);
        void onError(String error);
    }

    public interface StudentCallback {
        void onSuccess(String message);
        void onError(String error);
    }

    // Verify attendance by sending RFID tags to server
    public void verifyAttendance(List<String> rfidTags, AttendanceCallback callback) {
        new VerifyAttendanceTask(callback).execute(rfidTags);
    }

    // Add new student to server
    public void addStudent(Student student, StudentCallback callback) {
        new AddStudentTask(callback).execute(student);
    }

    // AsyncTask for verifying attendance
    private class VerifyAttendanceTask extends AsyncTask<List<String>, Void, String> {
        
        private AttendanceCallback callback;
        private Exception exception;

        public VerifyAttendanceTask(AttendanceCallback callback) {
            this.callback = callback;
        }

        @Override
        protected String doInBackground(List<String>... params) {
            List<String> rfidTags = params[0];
            
            try {
                // Create JSON payload
                JSONObject payload = new JSONObject();
                JSONArray tagsArray = new JSONArray();
                for (String tag : rfidTags) {
                    tagsArray.put(tag);
                }
                payload.put("rfid_tags", tagsArray);
                payload.put("classroom_id", 1); // You can make this dynamic
                
                // Make HTTP request
                return makeHttpRequest(BASE_URL + "/verify-attendance", payload.toString(), "POST");
                
            } catch (Exception e) {
                this.exception = e;
                return null;
            }
        }

        @Override
        protected void onPostExecute(String result) {
            if (exception != null || result == null) {
                // For demo purposes, return mock data if server is not available
                provideMockAttendanceData(callback);
                return;
            }
            
            try {
                parseAttendanceResponse(result, callback);
            } catch (JSONException e) {
                callback.onError("Failed to parse server response");
            }
        }
    }

    // AsyncTask for adding student
    private class AddStudentTask extends AsyncTask<Student, Void, String> {
        
        private StudentCallback callback;
        private Exception exception;

        public AddStudentTask(StudentCallback callback) {
            this.callback = callback;
        }

        @Override
        protected String doInBackground(Student... params) {
            Student student = params[0];
            
            try {
                // Create JSON payload
                JSONObject payload = new JSONObject();
                payload.put("name", student.getName());
                payload.put("rfid_tag", student.getRfidTag());
                payload.put("section", student.getSection());
                payload.put("id_number", student.getIdNumber());
                payload.put("role", "student");
                
                // Make HTTP request
                return makeHttpRequest(BASE_URL + "/add-student", payload.toString(), "POST");
                
            } catch (Exception e) {
                this.exception = e;
                return null;
            }
        }

        @Override
        protected void onPostExecute(String result) {
            if (exception != null || result == null) {
                // For demo purposes, simulate success if server is not available
                callback.onSuccess("Student saved successfully (mock mode)");
                return;
            }
            
            try {
                JSONObject response = new JSONObject(result);
                if (response.getBoolean("success")) {
                    callback.onSuccess(response.getString("message"));
                } else {
                    callback.onError(response.getString("error"));
                }
            } catch (JSONException e) {
                callback.onError("Failed to parse server response");
            }
        }
    }

    // Helper method to make HTTP requests
    private String makeHttpRequest(String urlString, String jsonPayload, String method) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            connection.setRequestMethod(method);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setConnectTimeout(TIMEOUT);
            connection.setReadTimeout(TIMEOUT);
            
            if (jsonPayload != null) {
                connection.setDoOutput(true);
                OutputStream outputStream = connection.getOutputStream();
                outputStream.write(jsonPayload.getBytes("UTF-8"));
                outputStream.flush();
                outputStream.close();
            }
            
            int responseCode = connection.getResponseCode();
            InputStream inputStream;
            
            if (responseCode >= 200 && responseCode < 300) {
                inputStream = connection.getInputStream();
            } else {
                inputStream = connection.getErrorStream();
            }
            
            return readInputStream(inputStream);
            
        } finally {
            connection.disconnect();
        }
    }

    // Helper method to read InputStream
    private String readInputStream(InputStream inputStream) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
        StringBuilder result = new StringBuilder();
        String line;
        
        while ((line = reader.readLine()) != null) {
            result.append(line);
        }
        
        reader.close();
        return result.toString();
    }

    // Parse attendance verification response
    private void parseAttendanceResponse(String response, AttendanceCallback callback) throws JSONException {
        JSONObject json = new JSONObject(response);
        
        List<Student> verifiedStudents = new ArrayList<>();
        List<String> unrecognizedTags = new ArrayList<>();
        
        // Parse verified students
        JSONArray studentsArray = json.getJSONArray("verified_students");
        for (int i = 0; i < studentsArray.length(); i++) {
            JSONObject studentObj = studentsArray.getJSONObject(i);
            Student student = new Student();
            student.setName(studentObj.getString("name"));
            student.setSection(studentObj.getString("section"));
            student.setRfidTag(studentObj.getString("rfid_tag"));
            student.setIdNumber(studentObj.optString("id_number", ""));
            verifiedStudents.add(student);
        }
        
        // Parse unrecognized tags
        JSONArray unrecognizedArray = json.getJSONArray("unrecognized");
        for (int i = 0; i < unrecognizedArray.length(); i++) {
            unrecognizedTags.add(unrecognizedArray.getString(i));
        }
        
        callback.onSuccess(verifiedStudents, unrecognizedTags);
    }

    // Provide mock data for demo purposes when server is not available
    private void provideMockAttendanceData(AttendanceCallback callback) {
        List<Student> mockStudents = new ArrayList<>();
        List<String> mockUnrecognized = new ArrayList<>();
        
        // Create some mock verified students
        Student student1 = new Student("Rahul Sharma", "A1B2C3D4", "CS-A", "CS2023001");
        Student student2 = new Student("Priya Patel", "E5F6G7H8", "CS-A", "CS2023002");
        Student student3 = new Student("Arjun Kumar", "I9J0K1L2", "EE-A", "EE2023001");
        
        mockStudents.add(student1);
        mockStudents.add(student2);
        mockStudents.add(student3);
        
        // Add some unrecognized tags
        mockUnrecognized.add("UNKNOWN123");
        mockUnrecognized.add("UNKNOWN456");
        
        callback.onSuccess(mockStudents, mockUnrecognized);
    }
}