// Mobile canvas — lay all phones out side by side

function App() {
  return (
    <div className="canvas">
      <div className="canvas-title">
        <h1>Kunfa Mobile</h1>
        <p>Phone-sized adaptation of the Kunfa platform — same design system (charcoal + amber, Newsreader + Inter Tight), restructured around a 5-tab bottom bar.</p>
      </div>
      <MHome />
      <MDeals />
      <MCommunity />
      <MInvitations />
      <MFounder />
      <MInvestor />
      <MFAQ />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
