object @preupgrade_report
extends "api/v2/preupgrade_reports/base"

# Add metadata for the table pagination to work
node(:total) { @preupgrade_report_entries&.total_entries || @preupgrade_report.preupgrade_report_entries.count }
node(:subtotal) { @preupgrade_report_entries&.total_entries || @preupgrade_report.preupgrade_report_entries.count }

# Render the entries. 
# Logic: If the controller prepared a sorted list (@preupgrade_report_entries), use it.
# Otherwise, fall back to the default list.
node(:preupgrade_report_entries) do |report|
  entries = @preupgrade_report_entries || report.preupgrade_report_entries
  entries.map { |entry| partial("api/v2/preupgrade_report_entries/base", :object => entry) }
end