import { Link } from 'react-router-dom';
import OfficialSource from './OfficialSource';
import BestTimeChart from './BestTimeChart';
import CrossingRankings from './CrossingRankings';

function CrossingLink({ slug, children }) {
  return (
    <Link to={`/crossing/${slug}`} className="text-emerald-700 dark:text-emerald-400 underline">
      {children}
    </Link>
  );
}

export const mdxComponents = {
  OfficialSource,
  BestTimeChart,
  CrossingRankings,
  CrossingLink,
  a: (props) => {
    const isExternal = /^https?:\/\//.test(props.href || '');
    if (isExternal) {
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
    return <a {...props} />;
  },
};
