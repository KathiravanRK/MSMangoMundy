import React from 'react';

export const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
    <tr className="animate-pulse">
        {[...Array(columns)].map((_, i) => (
            <td key={i} className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded"></div>
            </td>
        ))}
    </tr>
);
