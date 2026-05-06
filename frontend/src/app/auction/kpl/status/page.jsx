import { Suspense } from 'react';
import KplPortalEntry from '@/components/KplPortalEntry';

export default function KplStatusEntryPage() {
    return (
        <Suspense fallback={null}>
            <KplPortalEntry mode="status" />
        </Suspense>
    );
}
