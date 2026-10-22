import React from 'react';
import BorderLine from './BorderLine';
import CommuterSnapshot from './CommuterSnapshot';

export default function DashboardSummary({ direction, regionLabel, ...props }) {
  return (
    <>
      <CommuterSnapshot {...props} selectedDirection={direction} regionLabel={regionLabel} />
      <BorderLine {...props} direction={direction} />
    </>
  );
}
