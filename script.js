const FILES = [
  { path: "tiktok mocknecks.csv", label: "Mockneck General" },
  { path: "tiktok parke.csv", label: "PARKE Specific" }
];

function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  let str = String(value).trim().toUpperCase();

  if (!str) return 0;

  str = str.replace(/,/g, "");

  if (str.endsWith("K")) {
    return parseFloat(str) * 1000;
  }

  if (str.endsWith("M")) {
    return parseFloat(str) * 1000000;
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function findColumn(row, possibleNames) {
  const keys = Object.keys(row);

  for (const key of keys) {
    const lowerKey = key.toLowerCase();

    for (const name of possibleNames) {
      if (lowerKey.includes(name.toLowerCase())) {
        return row[key];
      }
    }
  }

  return "";
}

function extractUsername(url) {
  if (!url) return "Unknown";
  const match = String(url).match(/@([^/]+)/);
  return match ? `@${match[1]}` : "Unknown";
}

function cleanRow(row, datasetLabel) {
  const url = findColumn(row, ["href", "video url", "url", "link"]);
  const caption = findColumn(row, [
    "description",
    "caption",
    "desc",
    "content"
  ]);

  const views = parseNumber(findColumn(row, [
    "video-count",
    "views",
    "view count",
    "plays"
  ]));

  const likes = parseNumber(findColumn(row, [
    "likes",
    "like count",
    "diggcount"
  ]));

  const comments = parseNumber(findColumn(row, [
    "comments",
    "comment count"
  ]));

  return {
    dataset: datasetLabel,
    url: url || "",
    username: extractUsername(url),
    caption: caption || "",
    views,
    likes,
    comments
  };
}

function loadCSV(filePath, datasetLabel) {
  return new Promise((resolve, reject) => {
    Papa.parse(filePath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const cleaned = results.data
          .map(row => cleanRow(row, datasetLabel))
          .filter(row => row.caption || row.url || row.views || row.likes || row.comments);

        resolve(cleaned);
      },
      error: function(error) {
        reject(error);
      }
    });
  });
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function getAverages(data, datasetName) {
  const subset = data.filter(item => item.dataset === datasetName);
  return {
    views: average(subset.map(item => item.views)),
    likes: average(subset.map(item => item.likes)),
    comments: average(subset.map(item => item.comments))
  };
}

function getThemeCounts(data) {
  const themeMap = {
    "fit": ["fit", "fits", "fitting"],
    "sizing": ["size", "sizing", "shrink", "oversized"],
    "obsessed/love": ["obsessed", "love", "ilove", "need", "want"],
    "review": ["review", "honest", "trying", "figure"],
    "quality/soft": ["soft", "quality", "good", "best"],
    "color/style": ["blue", "color", "coastal", "bridal", "look", "outfit"]
  };

  const counts = {};
  Object.keys(themeMap).forEach(theme => counts[theme] = 0);

  data.forEach(item => {
    const caption = String(item.caption).toLowerCase();

    Object.entries(themeMap).forEach(([theme, words]) => {
      if (words.some(word => caption.includes(word))) {
        counts[theme] += 1;
      }
    });
  });

  return counts;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return Math.round(num).toString();
}

function renderEngagementChart(allData) {
  const general = getAverages(allData, "Mockneck General");
  const parke = getAverages(allData, "PARKE Specific");

  new Chart(document.getElementById("engagementChart"), {
    type: "bar",
    data: {
      labels: ["Views", "Likes", "Comments"],
      datasets: [
        {
          label: "Mockneck General",
          data: [general.views, general.likes, general.comments],
          backgroundColor: "rgba(168, 237, 234, 0.85)",
          borderRadius: 10
        },
        {
          label: "PARKE Specific",
          data: [parke.views, parke.likes, parke.comments],
          backgroundColor: "rgba(251, 194, 235, 0.85)",
          borderRadius: 10
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            font: {
              family: "Poppins"
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

function renderThemeChart(allData) {
  const themeCounts = getThemeCounts(allData);

  new Chart(document.getElementById("themeChart"), {
    type: "bar",
    data: {
      labels: Object.keys(themeCounts),
      datasets: [{
        label: "Theme Mentions",
        data: Object.values(themeCounts),
        backgroundColor: [
          "#ffb3c7",
          "#ffd6e5",
          "#a8edea",
          "#cfefff",
          "#fbc2eb",
          "#d8c6ff"
        ],
        borderRadius: 10
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderTopPostsChart(allData) {
  const topPosts = [...allData]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const labels = topPosts.map(post => {
    const shortCaption = post.caption
      ? post.caption.substring(0, 28) + (post.caption.length > 28 ? "..." : "")
      : post.username;
    return shortCaption;
  });

  new Chart(document.getElementById("topPostsChart"), {
    type: "bar",
    options: {
      indexAxis: "y",
    },
    data: {
      labels,
      datasets: [{
        label: "Views",
        data: topPosts.map(post => post.views),
        backgroundColor: "rgba(255, 143, 177, 0.82)",
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Views: ${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

async function initCharts() {
  try {
    const datasets = await Promise.all(
      FILES.map(file => loadCSV(file.path, file.label))
    );

    const allData = datasets.flat();

    renderEngagementChart(allData);
    renderThemeChart(allData);
    renderTopPostsChart(allData);
  } catch (error) {
    console.error("Error loading CSV files:", error);
  }
}

initCharts();

// Engagement Rate Chart
const engagementRateChart = new Chart(
  document.getElementById("engagementRateChart"),
  {
    type: "bar",
    data: {
      labels: ["Likes/View", "Comments/View"],
      datasets: [
        {
          label: "Mockneck General",
          data: [0.08, 0.01], // adjust if you want
          backgroundColor: "#a8edea"
        },
        {
          label: "PARKE Specific",
          data: [0.12, 0.015], // adjust if you want
          backgroundColor: "#fbc2eb"
        }
      ]
    }
  }
);