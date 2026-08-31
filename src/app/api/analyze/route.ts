import { NextResponse } from 'next/server';
import { evaluateCandidate } from '@/lib/llmEvaluator';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { presetId, resumeText, githubUsername, targetRoleTitle } = body;

    let textToAnalyze = resumeText;
    let usernameToAnalyze = githubUsername;
    let roleTitle = targetRoleTitle || 'Full-Stack Software Engineer';

    // If preset requested
    if (presetId) {
      const preset = CANDIDATE_PRESETS.find(p => p.id === presetId);
      if (preset) {
        textToAnalyze = preset.rawResumeText;
        usernameToAnalyze = preset.githubUsername;
        roleTitle = preset.roleTitle;
      }
    }

    if (!textToAnalyze || textToAnalyze.trim().length < 50) {
      return NextResponse.json(
        { error: 'Resume text is required and must contain at least 50 characters.' },
        { status: 400 }
      );
    }

    const report = await evaluateCandidate(textToAnalyze, usernameToAnalyze, roleTitle);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('[API /api/analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete evaluation report.' },
      { status: 500 }
    );
  }
}
