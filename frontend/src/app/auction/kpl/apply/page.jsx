import { Suspense } from 'react';
import KplPortalEntry from '@/components/KplPortalEntry';

export default function KplApplyEntryPage() {
    return (
        <Suspense fallback={null}>
            <KplPortalEntry mode="apply" />
        </Suspense>
    );
}
