# frozen_string_literal: true

class PreupgradeReportEntry < ApplicationRecord
  belongs_to :preupgrade_report
  belongs_to_host

  # Scoped search for sorting and filtering
  scoped_search on: :title, complete_value: true
  scoped_search on: :hostname, complete_value: true
  scoped_search on: :severity, complete_value: true

  serialize :tags, Array
  serialize :flags, Array
  # Only include this if your 'detail' column is TEXT, not JSON/JSONB
  serialize :detail, JSON

  validates :preupgrade_report, :host, :hostname, :title, :actor, :audience, :severity, :leapp_run_id, presence: true

  def self.remediation_details(remediation_ids, host)
    where(id: remediation_ids, host: host).where.not(detail: nil).pluck(:detail)
  end
end
