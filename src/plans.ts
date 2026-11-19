// Free / Premium split, prepared but not sold: every account is 'free' until a payment provider is
// integrated (docs/LANCEMENT_PUBLIC.md §5). Features are checked here, never by comparing plan names elsewhere.
export type Plan = 'free' | 'premium';
export type Feature = 'ads' | 'compareBuilds' | 'extraCharacters' | 'analytics' | 'prioritySync';

const FEATURES: Record<Plan, ReadonlySet<Feature>> = {
  free: new Set(['ads']),                                    // core tools stay free; ads may be shown
  premium: new Set(['compareBuilds', 'extraCharacters', 'analytics', 'prioritySync']), // no 'ads'
};

export const hasFeature = (plan: Plan | null | undefined, f: Feature) => FEATURES[plan ?? 'free'].has(f);
export const asPlan = (x: unknown): Plan => (x === 'premium' ? 'premium' : 'free');
