import Button from './Button';

export default function Pagination({ hasMore, loading, onLoadMore }) {
  if (!hasMore) return null;

  return (
    <div className="pagination">
      <Button variant="default" onClick={onLoadMore} loading={loading}>
        Load More
      </Button>
    </div>
  );
}
