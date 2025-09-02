package com.attendance.nfc;

import java.io.Serializable;
import java.util.Date;

public class Student implements Serializable {
    
    private int personId;
    private String name;
    private String rfidTag;
    private String role;
    private String idNumber;
    private String section;
    private Date createdAt;

    public Student() {
        this.role = "student";
        this.createdAt = new Date();
    }

    public Student(String name, String rfidTag, String section, String idNumber) {
        this();
        this.name = name;
        this.rfidTag = rfidTag;
        this.section = section;
        this.idNumber = idNumber;
    }

    // Getters and Setters
    public int getPersonId() {
        return personId;
    }

    public void setPersonId(int personId) {
        this.personId = personId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRfidTag() {
        return rfidTag;
    }

    public void setRfidTag(String rfidTag) {
        this.rfidTag = rfidTag;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getIdNumber() {
        return idNumber;
    }

    public void setIdNumber(String idNumber) {
        this.idNumber = idNumber;
    }

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "Student{" +
                "personId=" + personId +
                ", name='" + name + '\'' +
                ", rfidTag='" + rfidTag + '\'' +
                ", section='" + section + '\'' +
                ", idNumber='" + idNumber + '\'' +
                '}';
    }

    // Helper methods
    public boolean isValid() {
        return name != null && !name.trim().isEmpty() &&
               rfidTag != null && !rfidTag.trim().isEmpty() &&
               section != null && !section.trim().isEmpty() &&
               idNumber != null && !idNumber.trim().isEmpty();
    }

    public String getDisplayName() {
        return name + " (" + idNumber + ")";
    }

    public String getSectionDisplay() {
        return section != null ? section : "Unknown";
    }
}