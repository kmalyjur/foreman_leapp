# frozen_string_literal: true

class PreupgradeReportEntry < ApplicationRecord
  belongs_to :preupgrade_report
  belongs_to_host

  # ADD: Scoped Search definitions
  # This tells the backend which columns to search when params[:search] is sent
  scoped_search :on => :title
  scoped_search :on => :hostname
  scoped_search :on => :severity
  # If you want to search by message or summary, add those fields too:
  # scoped_search :on => :summary 

  serialize :tags, Array
  serialize :flags, Array
  serialize :detail, JSON

  validates :preupgrade_report, :host, :hostname, :title, :actor, :audience, :severity, :leapp_run_id, presence: true

  def self.remediation_details(remediation_ids, host)
    where(id: remediation_ids, host: host).where.not(detail: nil).pluck(:detail)
  end
end
