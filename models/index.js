const Acquisition = require("./Acquisition");
const AcqisitionLineItems = require("./AcquisitionLineItems");

const Assets = require("./Assets");      // FIXED
const Allocation = require("./Allocation");
const AssetLog = require("./AssetLog"); // FIXED
const AssetIssue = require("./AssetIssues");
// Acquisition → LineItems
Acquisition.hasMany(AcqisitionLineItems, {
  foreignKey: "aq_po_no",
  sourceKey: "aq_po_no",
  as: "lineItems",
  constraints: false
});

AcqisitionLineItems.belongsTo(Acquisition, {
  foreignKey: "aq_po_no",
  targetKey: "aq_po_no",
  as: "acquisition",
  constraints: false
});

// Assets → Allocation
Assets.hasMany(Allocation, {
  foreignKey: "al_uniqueId",
  sourceKey: "tag"
});

Allocation.belongsTo(Assets, {
  foreignKey: "al_uniqueId",
  targetKey: "tag",
  onDelete: "CASCADE"
});

// ... associations
Assets.hasMany(AssetLog, { // Now 'AssetLog' correctly refers to your model
  foreignKey: "al_uniqueId",
  sourceKey: "tag"
});

// You should also add the other side of the association
AssetLog.belongsTo(Assets, {
  foreignKey: "al_uniqueId",
  targetKey: "tag"
});

Assets.hasMany(AssetIssue, { foreignKey: 'tag', sourceKey: 'tag' });
AssetIssue.belongsTo(Assets, { foreignKey: 'tag', targetKey: 'tag' });


module.exports = {
  Acquisition,
  AcqisitionLineItems,
  Assets,
  Allocation,
  AssetLog
};
