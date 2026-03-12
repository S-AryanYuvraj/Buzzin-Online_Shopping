package com.shop.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.shop.entity.User;

public interface UserRepository extends JpaRepository<User,Long>{
    
    User findByUsername(String username);
}