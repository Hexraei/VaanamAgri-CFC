export default function AboutView() {
  return (
    <main className="view">
      <h2>How Vaanam works</h2>
      <section className="card">
        <h3>The problem</h3>
        <p>
          Weather forecasts in India come out at block or district level - one forecast covers a huge area.
          But farming decisions happen village by village. Rain hitting one panchayat can miss the next one
          10 km away. Advice that is roughly right for the region is often wrong for YOUR field.
        </p>
      </section>
      <section className="card">
        <h3>The engine</h3>
        <p>
          Vaanam pulls gridded forecasts (Open-Meteo model blend), blends the 5 grid cells around your
          panchayat with inverse-distance weighting, corrects temperature for your panchayat's true
          elevation (90m DEM, lapse-rate), and grades confidence from how much the cells disagree.
        </p>
      </section>
      <section className="card">
        <h3>The advice</h3>
        <p>
          An agronomy rule pack turns the forecast into actions (skip spraying before rain, irrigate in a
          dry spell at flowering, drain before heavy rain). Gemini AI writes the advisory in plain Tamil;
          your phone reads it aloud. The Crop Doctor uses Gemini's vision to diagnose a leaf photo.
        </p>
      </section>
      <section className="card">
        <h3>Built as a Digital Public Good</h3>
        <p>
          Open source, zero running cost, deployable by any state agriculture department. Panchayat
          coverage extends through the Local Government Directory scheme - this build ships a Tamil Nadu
          demo set plus sample panchayats in Andhra Pradesh, Karnataka and Punjab.
        </p>
      </section>
      <p className="muted tiny">Team Hornets · Build with AI: Code for Communities 2026 · Track 04: Agricultural Intelligence</p>
    </main>
  );
}
