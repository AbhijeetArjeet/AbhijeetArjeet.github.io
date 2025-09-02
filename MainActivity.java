package com.attendance.nfc;

import android.content.Intent;
import android.nfc.NfcAdapter;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private NfcAdapter nfcAdapter;
    private TextView nfcStatusText;
    private Button scanModeButton;
    private Button addStudentButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeViews();
        checkNFCSupport();
    }

    private void initializeViews() {
        nfcStatusText = findViewById(R.id.nfcStatusText);
        scanModeButton = findViewById(R.id.scanModeButton);
        addStudentButton = findViewById(R.id.addStudentButton);
        
        scanModeButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isNFCAvailable()) {
                    Intent intent = new Intent(MainActivity.this, ScanActivity.class);
                    startActivity(intent);
                } else {
                    showNFCError();
                }
            }
        });
        
        addStudentButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, AddStudentActivity.class);
                startActivity(intent);
            }
        });
    }

    private void checkNFCSupport() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        
        if (nfcAdapter == null) {
            nfcStatusText.setText("❌ NFC not supported on this device");
            nfcStatusText.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
            scanModeButton.setEnabled(false);
        } else if (!nfcAdapter.isEnabled()) {
            nfcStatusText.setText("⚠️ NFC is disabled - Please enable in Settings");
            nfcStatusText.setTextColor(getResources().getColor(android.R.color.holo_orange_dark));
        } else {
            nfcStatusText.setText("✅ NFC is ready and available");
            nfcStatusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
        }
    }

    private boolean isNFCAvailable() {
        return nfcAdapter != null && nfcAdapter.isEnabled();
    }

    private void showNFCError() {
        if (nfcAdapter == null) {
            Toast.makeText(this, "This device does not support NFC", Toast.LENGTH_LONG).show();
        } else if (!nfcAdapter.isEnabled()) {
            Toast.makeText(this, "Please enable NFC in Settings to use scanning features", Toast.LENGTH_LONG).show();
            
            // Optional: Open NFC settings
            Intent intent = new Intent(android.provider.Settings.ACTION_NFC_SETTINGS);
            startActivity(intent);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Recheck NFC status when activity resumes
        checkNFCSupport();
    }
}