"use client";

import { User, ApiResponse } from "@repo/types";
import { useState, useEffect } from "react";

export default function UsersExample() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Example: fetch user from API
    const fetchUser = async () => {
      const response: ApiResponse<User> = {
        success: true,
        data: {
          id: "1",
          name: "John Doe",
          email: "john@example.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      if (response.success && response.data) {
        setUser(response.data);
      }
    };

    fetchUser();
  }, []);

  return (
    <div>
      <h2>User Example</h2>
      {user && (
        <div>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
        </div>
      )}
    </div>
  );
}
