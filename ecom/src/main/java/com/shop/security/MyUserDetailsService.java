package com.shop.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.shop.entity.User;
import com.shop.repository.UserRepository;

@Service
public class MyUserDetailsService implements UserDetailsService{

    private UserRepository repo;

    public MyUserDetailsService(UserRepository repo){
        this.repo = repo;
    }


    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
       
        User user= repo.findByUsername(username);

        if(user==null){
            throw new UnsupportedOperationException("User not found");

        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .roles(user.getRole() != null ? user.getRole() : "USER")
                .build();
            }
    
}