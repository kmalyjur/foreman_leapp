# frozen_string_literal: true

object false

child(@preupgrade_report_entries => :results) do
  extends 'api/v2/preupgrade_report_entries/main'
end

node(:total) { @total }
node(:subtotal) { @subtotal }
node(:page) { params[:page].to_i.positive? ? params[:page].to_i : 1 }
node(:per_page) { params[:per_page].to_i.positive? ? params[:per_page].to_i : Setting[:entries_per_page] }
