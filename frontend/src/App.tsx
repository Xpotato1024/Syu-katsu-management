import { type FormEvent, useEffect } from "react"
import "./App.css"
import { apiBase, loginURL, logoutURL } from "./constants"
import { AgendaView } from "./components/AgendaView"
import { AuthPanel } from "./components/AuthPanel"
import { AppShell } from "./components/AppShell"
import { CompaniesView } from "./components/CompaniesView"
import { TimelineView } from "./components/TimelineView"
import { ToastViewport } from "./components/ToastViewport"
import { useCompanyManagement } from "./hooks/useCompanyManagement"
import { useNavigation } from "./hooks/useNavigation"
import { useTheme } from "./hooks/useTheme"
import { useTimeline } from "./hooks/useTimeline"
import { useToast } from "./hooks/useToast"
import { useViewer } from "./hooks/useViewer"

export function App() {
  const toast = useToast()
  const viewer = useViewer({ apiBase, onToast: toast.pushToast })
  const navigation = useNavigation()
  const theme = useTheme()
  const companies = useCompanyManagement({ apiBase, onToast: toast.pushToast })
  const timeline = useTimeline({ companies: companies.companies })

  useEffect(() => {
    void viewer.loadAuthConfig()
    void viewer.loadViewer({ silent: true })
    void companies.loadCompanies("", undefined, { silent: true })
  }, [viewer.loadAuthConfig, viewer.loadViewer, companies.loadCompanies])

  function onCreateCompany(event: FormEvent) {
    event.preventDefault()
    void companies.createCompany()
  }

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault()
    void companies.applyFilter()
  }

  function onReload() {
    navigation.closeMenu()
    void (async () => {
      const [viewerOk, companiesOk] = await Promise.all([
        viewer.loadViewer({ silent: true }),
        companies.loadCompanies(companies.filterName, companies.filterStatuses, { silent: true })
      ])

      if (viewerOk && companiesOk) {
        toast.pushToast("情報を更新しました。", "success")
      } else {
        toast.pushToast("情報更新に失敗しました。", "error")
      }
    })()
  }

  return (
    <AppShell
      isMenuOpen={navigation.isMenuOpen}
      activeView={navigation.activeView}
      theme={theme.theme}
      viewer={viewer.viewer}
      viewerError={viewer.viewerError}
      logoutURL={logoutURL}
      onToggleMenu={navigation.toggleMenu}
      onToggleTheme={theme.toggleTheme}
      onCloseMenu={navigation.closeMenu}
      onNavigate={navigation.navigateTo}
      onReload={onReload}
    >
      <AuthPanel
        apiBase={apiBase}
        loginURL={loginURL}
        authConfig={viewer.authConfig}
        viewer={viewer.viewer}
        viewerError={viewer.viewerError}
        onToast={toast.pushToast}
        onAuthChanged={() => {
          void viewer.loadViewer({ silent: true })
          void companies.loadCompanies(companies.filterName, companies.filterStatuses, { silent: true })
        }}
      />

      {navigation.activeView === "companies" && (
        <CompaniesView
          companies={companies.companies}
          loading={companies.loading}
          submitting={companies.submitting}
          savingFlowCompanyID={companies.savingFlowCompanyID}
          deletingStepID={companies.deletingStepID}
          deletingCompanyID={companies.deletingCompanyID}
          errorMessage={companies.errorMessage}
          filterName={companies.filterName}
          filterStatuses={companies.filterStatuses}
          nameInput={companies.nameInput}
          newCompanyMypageLink={companies.newCompanyMypageLink}
          newCompanyMypageId={companies.newCompanyMypageId}
          newCompanyStatus={companies.newCompanyStatus}
          newCompanyInterest={companies.newCompanyInterest}
          newSteps={companies.newSteps}
          stepDraftByCompany={companies.stepDraftByCompany}
          stepEdits={companies.stepEdits}
          companyEdits={companies.companyEdits}
          expandedCompanyIDs={companies.expandedCompanyIDs}
          onFilterNameChange={companies.setFilterName}
          onToggleFilterStatus={companies.toggleFilterStatus}
          onSelectAllFilterStatuses={companies.selectAllFilterStatuses}
          onFilterSubmit={onFilterSubmit}
          onClearFilter={() => void companies.clearFilter()}
          onNameInputChange={companies.setNameInput}
          onNewCompanyMypageLinkChange={companies.setNewCompanyMypageLink}
          onNewCompanyMypageIdChange={companies.setNewCompanyMypageId}
          onNewCompanyStatusChange={companies.setNewCompanyStatus}
          onNewCompanyInterestChange={companies.setNewCompanyInterest}
          onUpdateNewStep={companies.updateNewStep}
          onRemoveNewStep={companies.removeNewStep}
          onAddNewStep={companies.appendNewStep}
          onCreateCompany={onCreateCompany}
          onToggleCompanyDetail={companies.toggleCompanyDetail}
          onUpdateStepEdit={companies.updateStepEdit}
          onSaveFlow={(companyID) => void companies.saveFlow(companyID)}
          onDeleteStep={(companyID, stepID) => void companies.deleteStep(companyID, stepID)}
          onUpdateCompanyEdit={companies.updateCompanyEdit}
          onApplyResearchTemplate={companies.applyResearchTemplate}
          onSaveCompanyInfo={(companyID) => void companies.saveCompanyInfo(companyID)}
          onSaveCompanyDocuments={(companyID) => void companies.saveCompanyDocuments(companyID)}
          onDeleteCompany={(companyID) => void companies.deleteCompany(companyID)}
          savingCompanyInfoID={companies.savingCompanyInfoID}
          savingDocumentsCompanyID={companies.savingDocumentsCompanyID}
          onUpdateInlineDraft={companies.updateInlineDraft}
          onAddStepToCompany={(companyID) => void companies.addStepToCompany(companyID)}
        />
      )}

      {navigation.activeView === "timeline" && (
        <TimelineView
          timelineMonth={timeline.timelineMonth}
          onSetMonth={timeline.setTimelineMonthByInput}
          onPrevMonth={timeline.prevMonth}
          onNextMonth={timeline.nextMonth}
          calendarCompanyFilter={timeline.calendarCompanyFilter}
          onCalendarCompanyFilterChange={timeline.setCalendarCompanyFilter}
          onClearCalendarCompanyFilter={timeline.clearCalendarCompanyFilter}
          calendarFilteredCompanies={timeline.calendarFilteredCompanies}
          companiesCount={companies.companies.length}
          hasScheduledSteps={timeline.hasScheduledSteps}
          hasScheduledStepsForFilteredCompanies={timeline.hasScheduledStepsForFilteredCompanies}
          timelineDays={timeline.timelineDays}
          stepsByCompanyDay={timeline.stepsByCompanyDay}
        />
      )}

      {navigation.activeView === "agenda" && (
        <AgendaView
          timelineMonth={timeline.timelineMonth}
          onSetMonth={timeline.setTimelineMonthByInput}
          onPrevMonth={timeline.prevMonth}
          onNextMonth={timeline.nextMonth}
          calendarCompanyFilter={timeline.calendarCompanyFilter}
          onCalendarCompanyFilterChange={timeline.setCalendarCompanyFilter}
          onClearCalendarCompanyFilter={timeline.clearCalendarCompanyFilter}
          agendaEvents={timeline.agendaEvents}
          agendaGroups={timeline.agendaGroups}
          calendarFilteredCompanyCount={timeline.calendarFilteredCompanies.length}
          companiesCount={companies.companies.length}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </AppShell>
  )
}
