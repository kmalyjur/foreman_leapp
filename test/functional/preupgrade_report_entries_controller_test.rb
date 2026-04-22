# frozen_string_literal: true

require 'test_plugin_helper'

class PreupgradeReportEntriesControllerTest < ActionController::TestCase
  setup do
    @user = FactoryBot.create(:user, admin: false)
    @host = FactoryBot.create(:host)
    @report = FactoryBot.create(:preupgrade_report, host: @host)
    @entry = FactoryBot.create(:preupgrade_report_entry, host: @host, preupgrade_report: @report)
  end

  test 'should get auto_complete_search with required permissions' do
    User.any_instance.stubs(:can?).with('view_job_invocations').returns(true)
    User.any_instance.stubs(:can?).with('view_hosts').returns(true)

    get :auto_complete_search, params: { format: :json }, session: set_session_user(@user)
    assert_response :success
  end

  test 'should not get auto_complete_search without :view_hosts' do
    User.any_instance.stubs(:can?).with('view_job_invocations').returns(true)
    User.any_instance.stubs(:can?).with('view_hosts').returns(false)

    get :auto_complete_search, params: { format: :json }, session: set_session_user(@user)
    assert_response :forbidden
    assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_hosts'
  end

  test 'should not get auto_complete_search without :view_job_invocations' do
    User.any_instance.stubs(:can?).with('view_job_invocations').returns(false)

    get :auto_complete_search, params: { format: :json }, session: set_session_user(@user)
    assert_response :forbidden
    assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_job_invocations'
  end
end
