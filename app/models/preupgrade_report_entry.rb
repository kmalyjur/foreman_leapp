# frozen_string_literal: true

class PreupgradeReportEntry < ApplicationRecord
  belongs_to :preupgrade_report
  belongs_to_host

  serialize :tags, Array
  serialize :flags, Array
  serialize :detail, JSON

  validates :preupgrade_report, :host, :hostname, :title, :actor, :audience, :severity, :leapp_run_id, presence: true

  scoped_search on: :title, complete_value: true
  scoped_search on: :hostname, complete_value: true
  scoped_search on: :severity, complete_value: { high: 'high', medium: 'medium', low: 'low', info: 'info' }
  scoped_search on: :summary

  scoped_search on: :flags,
                rename: :inhibitor,
                only_explicit: true,
                operators: ['=', '!='],
                complete_value: { yes: 'yes', no: 'no' },
                ext_method: :search_yes_no_fields

  scoped_search on: :detail,
                rename: :has_remediation,
                only_explicit: true,
                operators: ['=', '!='],
                complete_value: { yes: 'yes', no: 'no' },
                ext_method: :search_yes_no_fields

  def self.remediation_details(remediation_ids, host)
    where(id: remediation_ids, host: host).where.not(detail: nil).pluck(:detail)
  end

  def self.search_yes_no_fields(key, operator, value)
    column, term = case key.to_sym
                   when :inhibitor       then ['flags', 'inhibitor']
                   when :has_remediation then ['detail', 'remediations']
                   end

    if (operator == '=' && value == 'yes') || (operator == '!=' && value == 'no')
      { conditions: "preupgrade_report_entries.#{column} LIKE '%%#{term}%%'" }
    else
      { conditions: "(preupgrade_report_entries.#{column} NOT LIKE '%%#{term}%%' OR preupgrade_report_entries.#{column} IS NULL)" }
    end
  end
end
