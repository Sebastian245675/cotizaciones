package com.conecting.team.entity;package com.conecting.team.entity;



import jakarta.persistence.*;import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;import lombok.Data;

import org.hibernate.annotations.UpdateTimestamp;import lombok.NoArgsConstructor;

import lombok.AllArgsConstructor;

import java.time.LocalDateTime;import org.hibernate.annotations.CreationTimestamp;

import org.hibernate.annotations.UpdateTimestamp;

@Entity

@Table(name = "sub_accounts")import java.time.LocalDateTime;

public class SubAccount {

    @Entity

    @Id@Table(name = "sub_accounts")

    @GeneratedValue(strategy = GenerationType.IDENTITY)@Data

    private Long id;@NoArgsConstructor

    @AllArgsConstructor

    @Column(nullable = false)public class SubAccount {

    private String name;    

        @Id

    @Column(nullable = false, unique = true)    @GeneratedValue(strategy = GenerationType.IDENTITY)

    private String email;    private Long id;

        

    @Column(name = "firebase_uid")    @Column(nullable = false)

    private String firebaseUid;    private String name;

        

    @Column(name = "is_admin")    @Column(nullable = false, unique = true)

    private Boolean isAdmin = false;    private String email;

        

    @Column(name = "is_sub_admin")    @Column(name = "firebase_uid")

    private Boolean isSubAdmin = true;    private String firebaseUid;

        

    @Column(name = "is_active")    @Column(name = "is_admin")

    private Boolean isActive = true;    private Boolean isAdmin = false;

        

    @Column(name = "credits")    @Column(name = "is_sub_admin")

    private Integer credits = 0;    private Boolean isSubAdmin = true;

        

    @Column(name = "last_login")    @Column(name = "is_active")

    private LocalDateTime lastLogin;    private Boolean isActive = true;

        

    @CreationTimestamp    @Column(name = "last_login")

    @Column(name = "created_at")    private LocalDateTime lastLogin;

    private LocalDateTime createdAt;    

        @CreationTimestamp

    @UpdateTimestamp    @Column(name = "created_at")

    @Column(name = "updated_at")    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;    

        @UpdateTimestamp

    // Constructors    @Column(name = "updated_at")

    public SubAccount() {}    private LocalDateTime updatedAt;

        

    public SubAccount(String name, String email, String firebaseUid) {    // Relación con TeamMember

        this.name = name;    @OneToOne(mappedBy = "subAccount", cascade = CascadeType.ALL, fetch = FetchType.LAZY)

        this.email = email;    private TeamMember teamMember;

        this.firebaseUid = firebaseUid;}
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirebaseUid() {
        return firebaseUid;
    }

    public void setFirebaseUid(String firebaseUid) {
        this.firebaseUid = firebaseUid;
    }

    public Boolean getIsAdmin() {
        return isAdmin;
    }

    public void setIsAdmin(Boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    public Boolean getIsSubAdmin() {
        return isSubAdmin;
    }

    public void setIsSubAdmin(Boolean isSubAdmin) {
        this.isSubAdmin = isSubAdmin;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public LocalDateTime getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(LocalDateTime lastLogin) {
        this.lastLogin = lastLogin;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}