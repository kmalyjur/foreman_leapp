object false

child(@preupgrade_report_entries => :results) do
  extends "api/v2/preupgrade_report_entries/main"
end

node(:total) { @preupgrade_report_entries.total_entries }
node(:subtotal) { @preupgrade_report_entries.total_entries }
node(:page) { params[:page].to_i > 0 ? params[:page].to_i : 1 }
node(:per_page) { params[:per_page].to_i > 0 ? params[:per_page].to_i : Setting[:entries_per_page] }
