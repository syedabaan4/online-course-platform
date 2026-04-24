export default function LoadingSpinner({ fullPage = false }) {
  if (fullPage) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  return <div className="spinner" style={{ margin: '8px auto' }} />;
}