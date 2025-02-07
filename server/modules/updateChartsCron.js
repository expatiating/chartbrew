const { CronJob } = require("cron");
const moment = require("moment");
const { Op } = require("sequelize");

const ChartController = require("../controllers/ChartController");

const chartController = new ChartController();

function runUpdate(chart) {
  if (moment(chart.lastAutoUpdate).add(chart.autoUpdate, "seconds").isBefore(moment())) {
    chartController.update(chart.id, { lastAutoUpdate: moment() })
      .then(() => {
        return chartController.updateChartData(chart.id, null, {});
      })
      .catch(() => {
        // console.log("error with chart", chart.id);
      });
  }
}

function updateCharts() {
  const conditions = {
    where: {
      autoUpdate: { [Op.gt]: 0 }
    },
    attributes: ["id", "lastAutoUpdate", "autoUpdate"],
  };

  return chartController.findAll(conditions)
    .then((charts) => {
      if (!charts || charts.length === 0) {
        return new Promise((resolve) => resolve({ completed: true }));
      }

      charts.forEach((chart) => {
        runUpdate(chart);
      });

      return { completed: true };
    })
    .catch((error) => {
      return new Promise((resolve, reject) => reject(error));
    });
}

module.exports = () => {
  // run once initially to cover for server downtime
  updateCharts();

  // now run the cron job
  const cron = new CronJob("0 */1 * * * *", () => {
    updateCharts();
  });

  cron.start();

  return cron;
};
