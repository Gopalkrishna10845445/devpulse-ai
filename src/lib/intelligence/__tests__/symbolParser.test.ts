import { describe, it, expect } from 'vitest';
import { parseSymbols } from '../symbolParser';

describe('symbolParser - TypeScript / JavaScript', () => {
  it('extracts functions, arrow functions, React components, classes, and interfaces', () => {
    const tsCode = `
export interface UserProfile {
  id: string;
  name: string;
}

export type RoleType = 'admin' | 'user';

export enum StatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UserService {
  getUser(): UserProfile { return { id: '1', name: 'Alex' }; }
}

export async function calculateMetrics(input: string): Promise<number> {
  return 42;
}

export const SidebarWidget = ({ title }: { title: string }) => {
  return <div>{title}</div>;
};
`;

    const symbols = parseSymbols('src/components/SidebarWidget.tsx', tsCode, 'TypeScript');
    const names = symbols.map(s => s.name);

    expect(names).toContain('UserProfile');
    expect(symbols.find(s => s.name === 'UserProfile')?.kind).toBe('interface');

    expect(names).toContain('RoleType');
    expect(symbols.find(s => s.name === 'RoleType')?.kind).toBe('type_alias');

    expect(names).toContain('StatusEnum');
    expect(symbols.find(s => s.name === 'StatusEnum')?.kind).toBe('enum');

    expect(names).toContain('UserService');
    expect(symbols.find(s => s.name === 'UserService')?.kind).toBe('class');

    expect(names).toContain('calculateMetrics');
    expect(symbols.find(s => s.name === 'calculateMetrics')?.kind).toBe('function');

    expect(names).toContain('SidebarWidget');
    expect(symbols.find(s => s.name === 'SidebarWidget')?.kind).toBe('component');
  });

  it('detects Next.js API route handler endpoints', () => {
    const routeCode = `
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  return NextResponse.json({ success: true });
}
`;
    const symbols = parseSymbols('src/app/api/analyze/route.ts', routeCode, 'TypeScript');
    const names = symbols.map(s => s.name);

    expect(names).toContain('GET');
    expect(names).toContain('POST');
    expect(symbols.find(s => s.name === 'GET')?.kind).toBe('endpoint');
    expect(symbols.find(s => s.name === 'POST')?.kind).toBe('endpoint');
  });
});

describe('symbolParser - Python', () => {
  it('extracts python def, async def, and class declarations', () => {
    const pyCode = `
class DataPipeline:
    def __init__(self):
        pass

def process_records(batch: list) -> int:
    return len(batch)

async def fetch_telemetry(username: str):
    pass
`;
    const symbols = parseSymbols('app/services/pipeline.py', pyCode, 'Python');
    const names = symbols.map(s => s.name);

    expect(names).toContain('DataPipeline');
    expect(symbols.find(s => s.name === 'DataPipeline')?.kind).toBe('class');

    expect(names).toContain('process_records');
    expect(symbols.find(s => s.name === 'process_records')?.kind).toBe('function');

    expect(names).toContain('fetch_telemetry');
    expect(symbols.find(s => s.name === 'fetch_telemetry')?.kind).toBe('function');
  });
});

describe('symbolParser - Go', () => {
  it('extracts Go functions, structs, and interfaces', () => {
    const goCode = `
package main

type Config struct {
    Port int
}

type Service interface {
    Run() error
}

func HandleRequest(w ResponseWriter, r *Request) {
}
`;
    const symbols = parseSymbols('server/main.go', goCode, 'Go');
    const names = symbols.map(s => s.name);

    expect(names).toContain('Config');
    expect(symbols.find(s => s.name === 'Config')?.kind).toBe('struct');

    expect(names).toContain('Service');
    expect(symbols.find(s => s.name === 'Service')?.kind).toBe('interface');

    expect(names).toContain('HandleRequest');
    expect(symbols.find(s => s.name === 'HandleRequest')?.kind).toBe('function');
  });
});

describe('symbolParser - Rust', () => {
  it('extracts Rust fn, struct, enum, and trait declarations', () => {
    const rsCode = `
pub struct User {
    pub id: u64,
}

pub enum Status {
    Active,
}

pub trait Repository {
    fn find(&self) -> Option<User>;
}

pub async fn execute_query(q: &str) -> bool {
    true
}
`;
    const symbols = parseSymbols('src/lib.rs', rsCode, 'Rust');
    const names = symbols.map(s => s.name);

    expect(names).toContain('User');
    expect(symbols.find(s => s.name === 'User')?.kind).toBe('struct');

    expect(names).toContain('Status');
    expect(symbols.find(s => s.name === 'Status')?.kind).toBe('enum');

    expect(names).toContain('Repository');
    expect(symbols.find(s => s.name === 'Repository')?.kind).toBe('trait');

    expect(names).toContain('execute_query');
    expect(symbols.find(s => s.name === 'execute_query')?.kind).toBe('function');
  });
});
