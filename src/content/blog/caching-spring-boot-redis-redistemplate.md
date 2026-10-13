---
title: 'Caching in Spring Boot with Redis and RedisTemplate'
description: 'How to integrate Redis as a caching layer in a Spring Boot application using RedisTemplate to reduce database load and response times, step by step with code.'
pubDate: 2026-10-14
tags: [spring boot, redis, caching, java]
draft: false
---

## Introduction

Caching is essential for improving application performance by reducing database load and response times. Redis, an in-memory data store, is widely used for caching in Spring Boot applications due to its speed and simplicity. In this article, I’ll walk you through integrating Redis as a caching layer in a Spring Boot application using `RedisTemplate`.

## Why Use Redis for Caching?

Redis is a great choice for caching because:

- High Performance — Being an in-memory store, it provides lightning-fast read and write operations.
- Scalability — Supports clustering and replication for horizontal scaling.
- Flexibility — Supports various data structures (strings, hashes, lists, sets, etc.).
- Persistence — Provides options for data persistence if needed.

## Setting Up Redis with Spring Boot

### 1. Add Dependencies

First, include the necessary dependencies in your `pom.xml` (for Maven projects):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### 2. Configure Redis

Add the following Redis configuration in `application.properties`:

```properties
spring.redis.host=localhost
spring.redis.port=6379
```

If using a Dockerized Redis, run the following command:

```bash
docker run --name redis-container -p 6379:6379 -d redis
```

### 3. Create Redis Configuration

Create a configuration class to define a `RedisTemplate` bean:

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        return template;
    }
}
```

By default, `StringRedisSerializer` serializes all data into string format. However, if you want to store data in JSON format, you should use `GenericJackson2JsonRedisSerializer` instead. This ensures structured and readable storage of complex objects.

```java
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
redisTemplate.setValueSerializer(new GenericJackson2JsonRedisSerializer());
```

This allows storing objects in JSON rather than plain strings, making it easier to work with structured data in Redis.

### 4. Implement Caching Using RedisTemplate

Interacting with Redis using `RedisTemplate`.

#### Cache Data Example

```java
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class ProductService {
    private final RedisTemplate<String, Object> redisTemplate;

    public ProductService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String getProductById(String id) {
        String key = "product:" + id;
        Object cachedProduct = redisTemplate.opsForValue().get(key);
        
        if (cachedProduct != null) {
            return (String) cachedProduct;
        }
        
        String product = fetchProductFromDb(id);
        redisTemplate.opsForValue().set(key, product, 10, TimeUnit.MINUTES);
        return product;
    }

    private String fetchProductFromDb(String id) {
        simulateSlowService();
        return "Product-" + id;
    }

    private void simulateSlowService() {
        try {
            TimeUnit.SECONDS.sleep(3);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

#### Key Features of ProductService

- Dependency Injection:
  - `RedisTemplate<String, Object>` is injected via the constructor for interacting with Redis.
- Fetching Product Data (`getProductById`):
  - Checks if the product exists in the Redis cache using `redisTemplate.opsForValue().get(key)`.
  - If found, returns the cached product immediately, avoiding a database call.
  - If not found, retrieves the product from a simulated database (`fetchProductFromDb(id)`) and caches it in Redis with a 10-minute expiration.
- Simulated Database Call (`fetchProductFromDb`):
  - Mimics a database fetch by returning `"Product-" + id` after a delay.
- Artificial Delay (`simulateSlowService`):
  - Introduces a 3-second delay to imitate a slow database query.

This caching mechanism significantly improves performance by reducing database load and speeding up response times. 🚀

#### Update Cache Manually

```java
public void updateProduct(String id, String newValue) {
    String key = "product:" + id;
    redisTemplate.opsForValue().set(key, newValue, 10, TimeUnit.MINUTES);
}
```

#### Remove Cache Manually

```java
public void removeProduct(String id) {
    String key = "product:" + id;
    redisTemplate.delete(key);
}
```

## Testing Redis Caching

Run the Spring Boot application and call the `getProductById` method multiple times. The first call will take longer, but subsequent calls will fetch data instantly from Redis.

## Conclusion

Using `RedisTemplate` for caching in Spring Boot gives greater control over cache operations. It enables setting custom expiration times and handling cache invalidation efficiently.
