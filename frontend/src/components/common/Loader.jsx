const Loader = ({ size = 40, text = '' }) => (
  <div className="loader-container">
    <div style={{ textAlign: 'center' }}>
      <div className="loader" style={{ width: size, height: size, margin: '0 auto' }} />
      {text && <p style={{ marginTop: 12, color: 'var(--gray-400)', fontSize: '0.85rem' }}>{text}</p>}
    </div>
  </div>
);

export default Loader;
