# @repo/types

Shared TypeScript types and interfaces for the Finvofy monorepo.

## Usage

### In NestJS (API)

```typescript
import { User, CreateUserDto, ApiResponse } from "@repo/types";

@Controller("users")
export class UsersController {
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ApiResponse<User>> {
    // ...
  }
}
```

### In Next.js (Web)

```typescript
import { User, PaginatedResponse } from "@repo/types";

async function getUsers(): Promise<PaginatedResponse<User>> {
  // ...
}
```

## Adding New Types

1. Create a new file in `src/` (e.g., `src/invoice.ts`)
2. Export your types/interfaces
3. Add the export to `src/index.ts`
