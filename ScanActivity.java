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
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class ScanActivity extends AppCompatActivity {

    private NfcAdapter nfcAdapter;
    private PendingIntent pendingIntent;
    private IntentFilter[] intentFiltersArray;
    private String[][] techListsArray;
    
    private TextView statusText;
    private TextView scanCountText;
    private Button startScanButton;
    private Button clearAllButton;
    private Button sendToServerButton;
    private RecyclerView scannedTagsList;
    
    private List&lt;AttendanceRecord&gt; scannedTags;
    private ScannedTagsAdapter adapter;
    private boolean isScanning = false;
    private Vibrator vibrator;
    private AttendanceAPI attendanceAPI;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan);
        
        initializeViews();
        setupNFC();
        setupRecyclerView();
        
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        attendanceAPI = new AttendanceAPI();
        scannedTags = new ArrayList&lt;&gt;();
        
        checkNFCSupport();
    }

    private void initializeViews() {
        statusText = findViewById(R.id.statusText);
        scanCountText = findViewById(R.id.scanCountText);
        startScanButton = findViewById(R.id.startScanButton);
        clearAllButton = findViewById(R.id.clearAllButton);
        sendToServerButton = findViewById(R.id.sendToServerButton);
        scannedTagsList = findViewById(R.id.scannedTagsList);
        
        startScanButton.setOnClickListener(v -&gt; toggleScanning());
        clearAllButton.setOnClickListener(v -&gt; clearAllScans());
        sendToServerButton.setOnClickListener(v -&gt; sendToServer());
        
        // Back button
        findViewById(R.id.backButton).setOnClickListener(v -&gt; finish());
    }

    private void setupNFC() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        
        // Create PendingIntent for NFC events
        Intent intent = new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (Build.VERSION.SDK_INT &gt;= Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_MUTABLE);
        } else {
            pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);
        }
        
        // Setup intent filters for NFC
        IntentFilter ndef = new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
        IntentFilter tagDiscovered = new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED);
        IntentFilter techDiscovered = new IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED);
        
        intentFiltersArray = new IntentFilter[]{ndef, tagDiscovered, techDiscovered};
        techListsArray = new String[][]{};
    }

    private void setupRecyclerView() {
        adapter = new ScannedTagsAdapter(scannedTags);
        scannedTagsList.setLayoutManager(new LinearLayoutManager(this));
        scannedTagsList.setAdapter(adapter);
    }

    private void checkNFCSupport() {
        if (nfcAdapter == null) {
            statusText.setText("NFC not supported on this device");
            startScanButton.setEnabled(false);
            return;
        }
        
        if (!nfcAdapter.isEnabled()) {
            statusText.setText("Please enable NFC in Settings");
            startScanButton.setEnabled(false);
            return;
        }
        
        statusText.setText("NFC ready - Tap 'Start Scanning' to begin");
    }

    private void toggleScanning() {
        if (isScanning) {
            stopScanning();
        } else {
            startScanning();
        }
    }

    private void startScanning() {
        isScanning = true;
        startScanButton.setText("Stop Scanning");
        statusText.setText("Scanning... Hold RFID tags near phone");
        statusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
        
        // Enable foreground dispatch for NFC
        if (nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, intentFiltersArray, techListsArray);
        }
    }

    private void stopScanning() {
        isScanning = false;
        startScanButton.setText("Start Scanning");
        statusText.setText("Scanning stopped");
        statusText.setTextColor(getResources().getColor(android.R.color.black));
        
        // Disable foreground dispatch
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this);
        }
    }

    private void clearAllScans() {
        scannedTags.clear();
        adapter.notifyDataSetChanged();
        updateScanCount();
        Toast.makeText(this, "All scans cleared", Toast.LENGTH_SHORT).show();
    }

    private void sendToServer() {
        if (scannedTags.isEmpty()) {
            Toast.makeText(this, "No scans to send", Toast.LENGTH_SHORT).show();
            return;
        }
        
        statusText.setText("Sending to server...");
        statusText.setTextColor(getResources().getColor(android.R.color.holo_blue_dark));
        
        // Convert scanned tags to RFID list
        List&lt;String&gt; rfidTags = new ArrayList&lt;&gt;();
        for (AttendanceRecord record : scannedTags) {
            rfidTags.add(record.getRfidTag());
        }
        
        attendanceAPI.verifyAttendance(rfidTags, new AttendanceAPI.AttendanceCallback() {
            @Override
            public void onSuccess(List&lt;Student&gt; verifiedStudents, List&lt;String&gt; unrecognizedTags) {
                runOnUiThread(() -&gt; {
                    statusText.setText("Verification complete!");
                    statusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
                    
                    // Launch results activity
                    Intent intent = new Intent(ScanActivity.this, ResultsActivity.class);
                    intent.putExtra("verified_students", (ArrayList) verifiedStudents);
                    intent.putExtra("unrecognized_tags", (ArrayList) unrecognizedTags);
                    intent.putExtra("total_scans", scannedTags.size());
                    startActivity(intent);
                });
            }
            
            @Override
            public void onError(String error) {
                runOnUiThread(() -&gt; {
                    statusText.setText("Server error: " + error);
                    statusText.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
                    Toast.makeText(ScanActivity.this, "Failed to verify attendance", Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        if (!isScanning) {
            return;
        }
        
        // Handle NFC tag discovered
        if (NfcAdapter.ACTION_TAG_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TECH_DISCOVERED.equals(intent.getAction())) {
            
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                handleTagScanned(tag);
            }
        }
    }

    private void handleTagScanned(Tag tag) {
        // Convert tag ID to hex string
        byte[] tagId = tag.getId();
        StringBuilder hexString = new StringBuilder();
        for (byte b : tagId) {
            hexString.append(String.format("%02X", b));
        }
        String rfidTag = hexString.toString();
        
        // Check for duplicates
        boolean isDuplicate = false;
        for (AttendanceRecord record : scannedTags) {
            if (record.getRfidTag().equals(rfidTag)) {
                isDuplicate = true;
                break;
            }
        }
        
        // Add to scanned tags list
        AttendanceRecord record = new AttendanceRecord();
        record.setRfidTag(rfidTag);
        record.setTimestamp(new Date());
        record.setDuplicate(isDuplicate);
        
        scannedTags.add(record);
        adapter.notifyItemInserted(scannedTags.size() - 1);
        
        // Scroll to bottom
        scannedTagsList.smoothScrollToPosition(scannedTags.size() - 1);
        
        updateScanCount();
        
        // Provide feedback
        vibrator.vibrate(100);
        if (isDuplicate) {
            Toast.makeText(this, "Duplicate tag: " + rfidTag, Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "New tag: " + rfidTag, Toast.LENGTH_SHORT).show();
        }
    }

    private void updateScanCount() {
        int uniqueCount = 0;
        for (AttendanceRecord record : scannedTags) {
            if (!record.isDuplicate()) {
                uniqueCount++;
            }
        }
        scanCountText.setText("Total: " + scannedTags.size() + " | Unique: " + uniqueCount);
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