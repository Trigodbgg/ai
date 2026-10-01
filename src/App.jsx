import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardSections, stockList, stockProfiles } from './mockData';

const signalScoreMap = {
  Bullish: 1,
  Positive: 1,
  Undervalued: 1,
  Low: 1,
  BUY: 1,
  Buy: 1,
  Neutral: 0,
  Fairly: 0,
  'Fairly Valued': 0,
  Medium: 0,
  HOLD: 0,
  Hold: 0,
  Bearish: -1,
  Negative: -1,
  Overvalued: -1,
  High: -1,
  SELL: -1,
  Sell: -1,
};

const signalColorMap = {
  Bullish: '#23c483',
  Positive: '#23c483',
  Undervalued: '#23c483',
  Low: '#23c483',
  Buy: '#23c483',
  Neutral: '#f5b942',
  Fairly: '#f5b942',
  'Fairly Valued': '#f5b942',
  Medium: '#f5b942',
  Hold: '#f5b942',
  Bearish: '#ff5f70',
  Negative: '#ff5f70',
  Overvalued: '#ff5f70',
  High: '#ff5f70',
  Sell: '#ff5f70',
};

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
}).format(value);

const formatCompact = (value) => new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value);

function App() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [activeAgent, setActiveAgent] = useState('fundamental');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startingCapital, setStartingCapital] = useState(100000);
  const [historicalPeriod, setHistoricalPeriod] = useState('6M');
  const [strategy, setStrategy] = useState('Balanced');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedProfile = stockProfiles[selectedStock];

  const consensus = useMemo(() => {
    const normalized = selectedProfile.agents.map((agent) => {
      const signal = agent.signal || 'Neutral';
      const rawScore = signalScoreMap[signal] ?? 0;
      return {
        ...agent,
        numericSignal: rawScore,
        weightedScore: rawScore * (agent.confidence / 100),
      };
    });

    const score = normalized.reduce((acc, item) => acc + item.weightedScore, 0) / normalized.length;
    const bullishCount = normalized.filter((item) => item.numericSignal > 0).length;
    const neutralCount = normalized.filter((item) => item.numericSignal === 0).length;
    const bearishCount = normalized.filter((item) => item.numericSignal < 0).length;

    let overallSignal = 'HOLD';
    if (score > 0.26) overallSignal = 'BUY';
    if (score < -0.26) overallSignal = 'SELL';

    return {
      score,
      overallSignal,
      overallConfidence: Math.round(((score + 1) / 2) * 100),
      bullishCount,
      neutralCount,
      bearishCount,
      agentRows: normalized.map((agent) => ({
        name: agent.name,
        signal: agent.signal,
        confidence: agent.confidence,
        score: agent.numericSignal,
      })),
    };
  }, [selectedProfile]);

  const activeAgentData =
    selectedProfile.agents.find((agent) => agent.id === activeAgent) ?? selectedProfile.agents[0];

  const backtest = useMemo(() => {
    const multiplierMap = {
      '1M': 1.02,
      '3M': 1.06,
      '6M': 1.12,
      '1Y': 1.2,
    };

    const strategyBoost = {
      Momentum: 1.08,
      Value: 1.03,
      Balanced: 1.06,
      Defensive: 1.01,
    };

    const baseValue = startingCapital * (multiplierMap[historicalPeriod] || 1.12) * (strategyBoost[strategy] || 1.06);
    const returnPct = ((baseValue - startingCapital) / startingCapital) * 100;
    const maxDrawdown = selectedProfile.riskMetrics.maxDrawdown * (strategy === 'Defensive' ? 0.8 : 1.1);
    const tradeCount = {
      '1M': 4,
      '3M': 7,
      '6M': 12,
      '1Y': 18,
    }[historicalPeriod] || 12;

    return {
      initialInvestment: startingCapital,
      finalValue: baseValue,
      totalReturn: returnPct,
      maxDrawdown,
      trades: tradeCount,
      winRate: strategy === 'Momentum' ? 62 : strategy === 'Value' ? 58 : 60,
    };
  }, [historicalPeriod, selectedProfile, startingCapital, strategy]);

  const priceChartData = selectedProfile.priceHistory.map((point) => ({
    ...point,
    price: Number(point.value.toFixed(2)),
  }));

  const volumeChartData = selectedProfile.volumeHistory.map((point) => ({
    ...point,
    volume: Number(point.value),
  }));

  const rsiChartData = selectedProfile.rsiHistory.map((point) => ({
    ...point,
    rsi: Number(point.value.toFixed(1)),
  }));

  const agentChartData = selectedProfile.agents.map((agent) => ({
    name: agent.name.split(' ')[0],
    confidence: agent.confidence,
    signal: agent.signal,
  }));

  const distributionData = [
    { name: 'Bullish', value: consensus.bullishCount },
    { name: 'Neutral', value: consensus.neutralCount },
    { name: 'Bearish', value: consensus.bearishCount },
  ];

  const portfolioChartData = selectedProfile.portfolioHistory.map((point, index) => ({
    name: point.date,
    value: Number(point.value),
    index,
  }));

  const renderActionButtons = () => (
    <div className="action-group">
      <button className="primary-button">Run Simulation</button>
      <button className="secondary-button">Export Summary</button>
    </div>
  );

  const renderDashboard = () => (
    <>
      <section className="overview-grid">
        <div className="stat-card emphasis">
          <div className="stat-header">
            <span>Current Simulated Price</span>
            <span className="badge success">{selectedProfile.marketTrend}</span>
          </div>
          <h2>{formatCurrency(selectedProfile.price)}</h2>
          <div className="mini-row">
            <span className="positive">{selectedProfile.changePct > 0 ? '+' : ''}{selectedProfile.changePct}%</span>
            <span>Today</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span>Volume</span>
            <span className="badge neutral">{selectedProfile.volatilityLevel}</span>
          </div>
          <h3>{formatCompact(selectedProfile.volume)}</h3>
          <p>Average turnover</p>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span>Market Trend</span>
          </div>
          <h3>{selectedProfile.marketTrend}</h3>
          <p>Momentum bias</p>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span>Volatility</span>
          </div>
          <h3>{selectedProfile.volatilityLevel}</h3>
          <p>{selectedProfile.riskMetrics.volatility}% realized vol</p>
        </div>
      </section>

      <div className="chart-layout">
        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>Price Trend</h3>
            <span className="sim-label">Simulation / Educational Only</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={priceChartData}>
              <defs>
                <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#49d39a" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#49d39a" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#101827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="price" stroke="#49d39a" fill="url(#priceFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>Volume</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={volumeChartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [formatCompact(value), 'Volume']}
                contentStyle={{ background: '#101827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              />
              <Bar dataKey="volume" fill="#6ea8fe" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-layout small-charts">
        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>RSI</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rsiChartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <YAxis domain={[30, 80]} tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [`${value}`, 'RSI']}
                contentStyle={{ background: '#101827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="rsi" stroke="#ffae57" fill="rgba(255,174,87,0.15)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>Simulated Portfolio</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={portfolioChartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Portfolio']}
                contentStyle={{ background: '#101827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              />
              <Line type="monotone" dataKey="value" stroke="#7c7cff" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );

  const renderAnalysis = () => (
    <>
      <section className="agent-grid">
        {selectedProfile.agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={`agent-card ${activeAgent === agent.id ? 'active' : ''}`}
            onClick={() => setActiveAgent(agent.id)}
          >
            <div className="agent-header">
              <span>{agent.name}</span>
              <span className="signal-pill" style={{ background: `${signalColorMap[agent.signal] || '#7c7cff'}22`, color: signalColorMap[agent.signal] || '#7c7cff' }}>
                {agent.signal}
              </span>
            </div>
            <div className="confidence-row">
              <span>Confidence</span>
              <strong>{agent.confidence}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${agent.confidence}%`, background: signalColorMap[agent.signal] || '#7c7cff' }} />
            </div>
            <p>{agent.explanation}</p>
          </button>
        ))}
      </section>

      <div className="panel reasoning-panel">
        <div className="panel-header">
          <h3>Agent Reasoning</h3>
          <span className="sim-label">Explainability</span>
        </div>
        <div className="reasoning-grid">
          <div>
            <h4>{activeAgentData.name}</h4>
            <div className="metric-stack">
              <div>
                <span>Signal</span>
                <strong>{activeAgentData.signal}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{activeAgentData.confidence}%</strong>
              </div>
            </div>
            <p>{activeAgentData.explanation}</p>
          </div>
          <div>
            <h4>Input Factors</h4>
            <ul className="factor-list">
              {activeAgentData.factors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  const renderConsensus = () => (
    <>
      <section className="consensus-summary panel">
        <div className="panel-header">
          <h3>Agent Consensus</h3>
          <span className="sim-label">Simulation/Research Prototype</span>
        </div>
        <div className="consensus-topline">
          <div>
            <span>Overall Signal</span>
            <h2>{consensus.overallSignal}</h2>
          </div>
          <div>
            <span>Overall Confidence</span>
            <h2>{consensus.overallConfidence}%</h2>
          </div>
          <div>
            <span>Distribution</span>
            <h4>{consensus.bullishCount} / {consensus.neutralCount} / {consensus.bearishCount}</h4>
          </div>
        </div>

        <div className="gauge-panel">
          <div className="gauge-outer">
            <div
              className="gauge-fill"
              style={{ width: `${consensus.overallConfidence}%`, background: consensus.overallSignal === 'BUY' ? '#23c483' : consensus.overallSignal === 'SELL' ? '#ff5f70' : '#f5b942' }}
            />
          </div>
          <div className="gauge-meta">
            <span>Bullish: {consensus.bullishCount}</span>
            <span>Neutral: {consensus.neutralCount}</span>
            <span>Bearish: {consensus.bearishCount}</span>
          </div>
        </div>

        <p className="consensus-note">
          Final signal is generated by aggregating the simulated outputs of multiple specialized agents.
        </p>
      </section>

      <div className="chart-layout">
        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>Agent Confidence</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agentChartData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fill: '#8e9aac', fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${value}%`, 'Confidence']} contentStyle={{ background: '#101827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Bar dataKey="confidence" radius={[0, 8, 8, 0]}>
                {agentChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.signal === 'Bullish' || entry.signal === 'Positive' || entry.signal === 'Undervalued' ? '#23c483' : entry.signal === 'Neutral' || entry.signal === 'Fairly Valued' || entry.signal === 'Medium' ? '#f5b942' : '#ff5f70'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {distributionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === 'Bullish' ? '#23c483' : entry.name === 'Neutral' ? '#f5b942' : '#ff5f70'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#101827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );

  const renderBacktesting = () => (
    <section className="panel backtest-panel">
      <div className="panel-header">
        <h3>Backtesting Simulation</h3>
        <span className="sim-label">Demo data only</span>
      </div>

      <div className="backtest-form">
        <label>
          Starting capital
          <input type="number" value={startingCapital} onChange={(event) => setStartingCapital(Number(event.target.value) || 0)} />
        </label>
        <label>
          Historical period
          <select value={historicalPeriod} onChange={(event) => setHistoricalPeriod(event.target.value)}>
            <option value="1M">1M</option>
            <option value="3M">3M</option>
            <option value="6M">6M</option>
            <option value="1Y">1Y</option>
          </select>
        </label>
        <label>
          Strategy
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
            <option value="Momentum">Momentum</option>
            <option value="Value">Value</option>
            <option value="Balanced">Balanced</option>
            <option value="Defensive">Defensive</option>
          </select>
        </label>
      </div>

      <div className="backtest-grid">
        <div className="stat-card">
          <span>Initial investment</span>
          <h3>{formatCurrency(backtest.initialInvestment)}</h3>
        </div>
        <div className="stat-card">
          <span>Final simulated value</span>
          <h3>{formatCurrency(backtest.finalValue)}</h3>
        </div>
        <div className="stat-card">
          <span>Total return</span>
          <h3 className={backtest.totalReturn >= 0 ? 'positive' : 'negative'}>{backtest.totalReturn.toFixed(1)}%</h3>
        </div>
        <div className="stat-card">
          <span>Max drawdown</span>
          <h3>{backtest.maxDrawdown.toFixed(1)}%</h3>
        </div>
        <div className="stat-card">
          <span>Trades</span>
          <h3>{backtest.trades}</h3>
        </div>
        <div className="stat-card">
          <span>Win rate</span>
          <h3>{backtest.winRate}%</h3>
        </div>
      </div>

      <p className="disclaimer">
        Backtest uses simulated/demo market data only for educational and research prototype purposes.
      </p>
    </section>
  );

  const renderRisk = () => (
    <section className="risk-layout">
      <div className="panel risk-panel">
        <div className="panel-header">
          <h3>Risk Analysis</h3>
          <span className="badge neutral">{selectedProfile.riskMetrics.maxDrawdown}% max drawdown</span>
        </div>
        <div className="metrics-grid">
          <div>
            <span>Volatility</span>
            <strong>{selectedProfile.riskMetrics.volatility}%</strong>
          </div>
          <div>
            <span>VaR</span>
            <strong>{selectedProfile.riskMetrics.var}%</strong>
          </div>
          <div>
            <span>Beta</span>
            <strong>{selectedProfile.riskMetrics.beta}</strong>
          </div>
          <div>
            <span>Risk Level</span>
            <strong>{selectedProfile.riskMetrics.maxDrawdown > 25 ? 'High' : selectedProfile.riskMetrics.maxDrawdown > 18 ? 'Medium' : 'Low'}</strong>
          </div>
        </div>
      </div>
      <div className="panel risk-panel">
        <div className="panel-header">
          <h3>Portfolio Risk Summary</h3>
        </div>
        <ul className="risk-list">
          <li>Market volatility remains within a simulated moderate-to-high range for this security.</li>
          <li>Value-at-risk is reduced when signal aggregation remains diverse across agents.</li>
          <li>Drawdown exposure is sensitive to macro shocks and concentrated sentiment swings.</li>
        </ul>
      </div>
    </section>
  );

  const renderAbout = () => (
    <section className="panel about-panel">
      <div className="panel-header">
        <h3>About Research</h3>
      </div>
      <div className="about-copy">
        <p>
          This project is inspired by the research paper “Agentic AI Powered Stock Market Analyst.”
          The idea is to mimic a market research workflow using multiple specialized agents rather than a single monolithic model.
        </p>
        <p>
          Each agent contributes to a different facet of analysis: data analysis, sentiment analysis, risk analysis, and strategy evaluation. The simulated signals are then aggregated into a final market recommendation.
        </p>
        <p>
          In the research paper, agent roles such as Market Information, Sentiment Analyst, Fundamental & Macroeconomic, Strategist, Risk, and Portfolio agents collaborate to interpret price, sentiment, valuation, and macro conditions. This prototype applies the same concept in a browser-only educational dashboard.
        </p>
        <ul>
          <li>Multiple specialized agents</li>
          <li>Signal aggregation and consensus synthesis</li>
          <li>Sentiment and risk evaluation</li>
          <li>Backtesting on mock historical data</li>
          <li>Explainability through agent reasoning panels</li>
        </ul>
      </div>
    </section>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">Agentic AI</div>
            <small>Prototype</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {dashboardSections.map((section) => (
            <button
              key={section}
              type="button"
              className={`nav-button ${activeSection === section ? 'active' : ''}`}
              onClick={() => setActiveSection(section)}
            >
              {section}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="project-label">Research Prototype</div>
            <h1>Agentic AI Stock Market Analyst</h1>
          </div>
          <div className="header-controls">
            <label className="stock-select-wrap">
              <span>Stock</span>
              <select value={selectedStock} onChange={(event) => {
                const nextTicker = event.target.value;
                setSelectedStock(nextTicker);
                setActiveAgent(stockProfiles[nextTicker].agents[0].id);
              }}>
                {stockList.map((stock) => (
                  <option key={stock.ticker} value={stock.ticker}>{stock.ticker}</option>
                ))}
              </select>
            </label>
            <div className="clock-display">
              <span>Market Time</span>
              <strong>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
            </div>
          </div>
        </header>

        <div className="content-header">
          <div>
            <h2>{selectedProfile.company}</h2>
            <p>Simulation / educational-only market research dashboard</p>
          </div>
          {renderActionButtons()}
        </div>

        {activeSection === 'Dashboard' && renderDashboard()}
        {activeSection === 'Agent Analysis' && renderAnalysis()}
        {activeSection === 'Consensus' && renderConsensus()}
        {activeSection === 'Backtesting' && renderBacktesting()}
        {activeSection === 'Risk Analysis' && renderRisk()}
        {activeSection === 'About Research' && renderAbout()}
      </main>
    </div>
  );
}

export default App;
