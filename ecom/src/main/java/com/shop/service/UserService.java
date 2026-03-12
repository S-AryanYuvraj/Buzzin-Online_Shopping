package com.shop.service;

import java.util.List;


import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.shop.entity.User;
import com.shop.repository.UserRepository;

@Service

public class UserService{

    private final UserRepository ur;
    private final PasswordEncoder passencode;

    public UserService(UserRepository ur,PasswordEncoder passencoder){
        this.ur=ur;
        this.passencode=passencoder;
    }

    public User register(User u){

        u.setPassword(passencode.encode(u.getPassword()));
        if (u.getRole() == null || u.getRole().isEmpty()) {
            u.setRole("USER");
        }
       return ur.save(u);
    }

    public List<User> listUser(){
       return ur.findAll();
    }

    public User authenticate(String username, String password){
      User user = ur.findByUsername(username);
      if(user == null || !passencode.matches(password, user.getPassword())){
         throw new UnsupportedOperationException("Invalid credentials");
      }
    return user;
    }


}
