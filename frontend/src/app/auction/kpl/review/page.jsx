import { Suspense } from 'react';
import KplPortalEntry from '@/components/KplPortalEntry';

export default function KplReviewEntryPage() {
    return (
        <Suspense fallback={null}>
            <KplPortalEntry mode="review" />
        </Suspense>
    );
}
