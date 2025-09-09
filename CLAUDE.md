# Claude Context File - Portfolio Allocation Analyzer

## 🚨 CRITICAL RULES - ABSOLUTE MANDATORY
- **NEVER COMMIT WITHOUT EXPLICIT USER APPROVAL** - Any unauthorized commit is a critical failure
- **NEVER COMMIT WHEN TESTS ARE FAILING** - Must ensure 100% test pass rate before commits
- **ALWAYS UPDATE PORTFOLIO_ANALYZER_DOCUMENTATION.md** for every feature/fix/improvement

## Project Overview
Swiss portfolio analysis tool built with Next.js 15.2.4, React 19, and TypeScript. Parses CSV files from Swiss banks, enriches data using Yahoo Finance API, and provides detailed allocation analysis with tax optimization insights.

## Technology Stack
- **Next.js**: 15.2.4 with App Router
- **React**: 19 (latest with concurrent features)
- **TypeScript**: 5.3.3 with strict mode
- **UI**: Tailwind CSS 3.4.17 + shadcn/ui + Radix UI
- **Testing**: Jest 29.7.0 with Testing Library
- **Data**: Papa Parse for CSV, React Dropzone for uploads
- **Charts**: Recharts for data visualization

## Development Standards
- **Test-Driven Development (TDD)**: Write tests before implementing features
- **Test Coverage**: >90% for critical business logic
- **TypeScript**: Use interfaces over types, strict mode enabled
- **React 19**: Server Components by default, Client Components only when needed
- **Next.js 15**: App Router, proper loading/error states
- **Styling**: Mobile-first responsive design with dark mode support

## File Structure & Import Paths
```
├── app/                    # Next.js App Router
│   ├── api/yahoo/         # Yahoo Finance API endpoints
│   └── *.tsx              # Pages and layouts
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility libraries
├── __tests__/            # Test organization:
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── components/      # Component tests
│   └── e2e/             # End-to-end tests
└── scripts/              # Utility scripts
```

**Path Aliases:**
- `@/*` → `./*`
- `@/components/*` → `./components/*`
- `@/lib/*` → `./lib/*`
- `@/hooks/*` → `./hooks/*`

## Common Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm test` - Run Jest tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - ESLint code linting
- `npm run build` - Production build

## Key Development Patterns

### TDD Cycle
1. Write failing test first (Red)
2. Implement minimal code to pass (Green)
3. Refactor and improve (Refactor)

### Component Pattern
```typescript
interface ComponentProps {
  // Define prop interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Component logic with proper error handling
  return (
    // JSX with accessibility (ARIA labels, keyboard navigation)
  );
}
```

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // API logic with proper error handling
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Data Fetching Pattern
```typescript
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

## Security & Performance
- Never expose API keys in client-side code
- Use environment variables for sensitive data
- Implement proper CORS policies and input validation
- Use React.memo for expensive components
- Implement proper loading states and error boundaries
- Use Next.js Image component for optimization

## Git Workflow
- **MANDATORY USER APPROVAL**: Never commit without explicit permission
- **TEST PASSING REQUIREMENT**: Never commit when tests fail
- **Documentation Updates**: Always update PORTFOLIO_ANALYZER_DOCUMENTATION.md
- Use descriptive commit messages with conventional format
- Keep commits atomic and focused

## Environment Variables
- `YAHOO_FINANCE_API_KEY`: Required for Yahoo Finance API access
- Use `.env.local` for local development
- Never commit sensitive data to version control

## Current Development Status
- Development server running on http://localhost:3000
- Project initialized and ready for feature development
- All dependencies updated to latest versions
- Following TDD approach with comprehensive test coverage