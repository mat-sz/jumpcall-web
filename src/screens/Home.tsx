import React from 'react';

const Home: React.FC = () => {
  return (
    <section className="center">
      <div className="new subsection">
        <label>
          Username:
          <input type="text" />
        </label>
        <button>Start a new meeting</button>
      </div>
      <div>...or use an invite link to join an existing meeting.</div>
    </section>
  );
};

export default Home;
