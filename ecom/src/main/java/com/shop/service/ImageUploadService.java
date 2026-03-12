package com.shop.service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;

@Service
public class ImageUploadService {

    private final Cloudinary cloudinary;

 public ImageUploadService(Cloudinary cloudinary){
      this.cloudinary = cloudinary;
   }

 public String uploadImage(MultipartFile file) throws IOException{
   Map<String, String> options = new HashMap<>();
  Object uploadResult = cloudinary.uploader().upload(file.getBytes(), options);
 return ((Map)uploadResult).get("secure_url").toString();
   }
}
