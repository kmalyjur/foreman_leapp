object @preupgrade_report
extends "api/v2/preupgrade_reports/base"

node(:total) { @preupgrade_report_entries.total_entries }
node(:subtotal) { @preupgrade_report_entries.total_entries }
node(:page) { @preupgrade_report_entries.current_page }
node(:per_page) { @preupgrade_report_entries.per_page }

node(:preupgrade_report_entries) do
  @preupgrade_report_entries.to_a.map do |entry|
    {
      id: entry.id,
      title: entry.title,
      hostname: entry.hostname,
      severity: entry.severity,
      flags: entry.flags || [],
      detail: entry.detail,
      summary: entry.summary,
      tags: entry.tags || []
    }
  end
end
