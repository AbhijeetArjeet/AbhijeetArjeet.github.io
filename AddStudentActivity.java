package com.attendance.nfc;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class AddStudentActivity extends AppCompatActivity {

    private NfcAdapter nfcAdapter;
    private PendingIntent pendingIntent;
    private IntentFilter[] intentFiltersArray;
    private String[][] techListsArray;
    
    private EditText studentNameEdit;
    private EditText rfidTagEdit;
    private Spinner sectionSpinner;
    private EditText applicationNumberEdit;
    private Button scanRfidButton;
    private Button saveStudentButton;
    private TextView statusText;
    
    private boolean isScanning = false;
    private Vibrator vibrator;
    private AttendanceAPI attendanceAPI;
    private DatabaseHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_student);
        
        initializeViews();
        setupNFC();
        setupSpinner();
        
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        attendanceAPI = new AttendanceAPI();
        dbHelper = new DatabaseHelper(this);
    }

    private void initializeViews() {
        studentNameEdit = findViewById(R.id.studentNameEdit);
        rfidTagEdit = findViewById(R.id.rfidTagEdit);
        sectionSpinner = findViewById(R.id.sectionSpinner);
        applicationNumberEdit = findViewById(R.id.applicationNumberEdit);
        scanRfidButton = findViewById(R.id.scanRfidButton);
        saveStudentButton = findViewById(R.id.saveStudentButton);
        statusText = findViewById(R.id.statusText);
        
        scanRfidButton.setOnClickListener(v -> toggleRfidScanning());
        saveStudentButton.setOnClickListener(v -> saveStudent());
        
        // Back button
        findViewById(R.id.backButton).setOnClickListener(v -> finish());
    }

    private void setupNFC() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        
        if (nfcAdapter == null) {
            statusText.setText("NFC not supported - Manual RFID entry only");
            scanRfidButton.setEnabled(false);
            return;
        }
        
        if (!nfcAdapter.isEnabled()) {
            statusText.setText("Please enable NFC in Settings");
            scanRfidButton.setEnabled(false);
            return;
        }
        
        // Create PendingIntent for NFC events
        Intent intent = new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_MUTABLE);
        } else {
            pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);
        }
        
        // Setup intent filters for NFC
        IntentFilter ndef = new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
        IntentFilter tagDiscovered = new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED);
        
        intentFiltersArray = new IntentFilter[]{ndef, tagDiscovered};
        techListsArray = new String[][]{};
        
        statusText.setText("Ready to add students");
    }

    private void setupSpinner() {
        // Define available sections
        String[] sections = {
            "Select Section",
            "CS-A", "CS-B", "CS-C",
            "EE-A", "EE-B", "EE-C", 
            "ME-A", "ME-B", "ME-C",
            "CE-A", "CE-B", "CE-C"
        };
        
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, 
            android.R.layout.simple_spinner_item, sections);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        sectionSpinner.setAdapter(adapter);
    }

    private void toggleRfidScanning() {
        if (isScanning) {
            stopRfidScanning();
        } else {
            startRfidScanning();
        }
    }

    private void startRfidScanning() {
        isScanning = true;
        scanRfidButton.setText("Stop RFID Scan");
        statusText.setText("Hold RFID tag near phone...");
        statusText.setTextColor(getResources().getColor(android.R.color.holo_blue_dark));
        
        // Enable foreground dispatch for NFC
        if (nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, intentFiltersArray, techListsArray);
        }
    }

    private void stopRfidScanning() {
        isScanning = false;
        scanRfidButton.setText("Scan RFID Tag");
        statusText.setText("RFID scanning stopped");
        statusText.setTextColor(getResources().getColor(android.R.color.black));
        
        // Disable foreground dispatch
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this);
        }
    }

    private void saveStudent() {
        // Validate input
        String name = studentNameEdit.getText().toString().trim();
        String rfidTag = rfidTagEdit.getText().toString().trim();
        String section = sectionSpinner.getSelectedItem().toString();
        String applicationNumber = applicationNumberEdit.getText().toString().trim();
        
        if (name.isEmpty()) {
            Toast.makeText(this, "Please enter student name", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (rfidTag.isEmpty()) {
            Toast.makeText(this, "Please enter or scan RFID tag", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (section.equals("Select Section")) {
            Toast.makeText(this, "Please select a section", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (applicationNumber.isEmpty()) {
            Toast.makeText(this, "Please enter application number", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Create student object
        Student student = new Student();
        student.setName(name);
        student.setRfidTag(rfidTag);
        student.setSection(section);
        student.setIdNumber(applicationNumber);
        student.setRole("student");
        
        // Save to local database first
        long localId = dbHelper.insertStudent(student);
        
        if (localId == -1) {
            Toast.makeText(this, "Error saving student locally", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Send to server
        statusText.setText("Saving student to server...");
        statusText.setTextColor(getResources().getColor(android.R.color.holo_blue_dark));
        
        attendanceAPI.addStudent(student, new AttendanceAPI.StudentCallback() {
            @Override
            public void onSuccess(String message) {
                runOnUiThread(() -> {
                    statusText.setText("Student saved successfully!");
                    statusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
                    Toast.makeText(AddStudentActivity.this, "Student added: " + name, Toast.LENGTH_LONG).show();
                    
                    // Clear form
                    clearForm();
                });
            }
            
            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    statusText.setText("Server error: " + error);
                    statusText.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
                    Toast.makeText(AddStudentActivity.this, "Saved locally, server sync failed", Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void clearForm() {
        studentNameEdit.setText("");
        rfidTagEdit.setText("");
        applicationNumberEdit.setText("");
        sectionSpinner.setSelection(0);
        statusText.setText("Ready to add another student");
        statusText.setTextColor(getResources().getColor(android.R.color.black));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        if (!isScanning) {
            return;
        }
        
        // Handle NFC tag discovered
        if (NfcAdapter.ACTION_TAG_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) {
            
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                handleRfidScanned(tag);
            }
        }
    }

    private void handleRfidScanned(Tag tag) {
        // Convert tag ID to hex string
        byte[] tagId = tag.getId();
        StringBuilder hexString = new StringBuilder();
        for (byte b : tagId) {
            hexString.append(String.format("%02X", b));
        }
        String rfidTag = hexString.toString();
        
        // Set the RFID tag in the text field
        rfidTagEdit.setText(rfidTag);
        
        // Stop scanning automatically
        stopRfidScanning();
        
        // Provide feedback
        vibrator.vibrate(200);
        Toast.makeText(this, "RFID captured: " + rfidTag, Toast.LENGTH_SHORT).show();
        
        statusText.setText("RFID tag captured successfully!");
        statusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isScanning && nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, intentFiltersArray, techListsArray);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this);
        }
    }
}