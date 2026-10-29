; Tauri CLI 2.12.4 embeds shortcut paths in single-quoted COM arguments.
; The apostrophe in Memole's World then splits those arguments while compiling
; NSIS. Keep display names intact and pass paths through runtime variables.
; Based on Tauri's utils.nsh (Apache-2.0/MIT); see TAURI-LICENSE-MIT.txt.
; Remove after upstream fixes it.
Var MWShortcutPath
Var MWShortcutTarget

!macroundef IsShortcutTarget
!macro IsShortcutTarget shortcut target
  StrCpy $MWShortcutPath "${shortcut}"
  StrCpy $MWShortcutTarget "${target}"
  StrCpy $3 0
  !insertmacro ComHlpr_CreateInProcInstance ${CLSID_ShellLink} ${IID_IShellLink} r0 ""
  ${If} $0 P<> 0
    ${IUnknown::QueryInterface} $0 '("${IID_IPersistFile}", .r1)'
    ${If} $1 P<> 0
      ${IPersistFile::Load} $1 '("$MWShortcutPath", ${STGM_READ})'
      System::Alloc MAX_PATH
      Pop $2
      ${IShellLink::GetPath} $0 '(.r2, ${MAX_PATH}, 0, ${SLGP_RAWPATH})'
      ${If} $2 == "$MWShortcutTarget"
        StrCpy $3 1
      ${EndIf}
      System::Free $2
      ${IUnknown::Release} $1 ""
    ${EndIf}
    ${IUnknown::Release} $0 ""
  ${EndIf}
  Push $3
!macroend

!macroundef SetShortcutTarget
!macro SetShortcutTarget shortcut target
  StrCpy $MWShortcutPath "${shortcut}"
  StrCpy $MWShortcutTarget "${target}"
  !insertmacro ComHlpr_CreateInProcInstance ${CLSID_ShellLink} ${IID_IShellLink} r0 ""
  ${If} $0 P<> 0
    ${IUnknown::QueryInterface} $0 '("${IID_IPersistFile}",.r1)'
    ${If} $1 P<> 0
      ${IPersistFile::Load} $1 '("$MWShortcutPath", ${STGM_READWRITE})'
      ${IShellLink::SetPath} $0 '(w "$MWShortcutTarget")'
      ${IPersistFile::Save} $1 '("$MWShortcutPath",1)'
      ${IUnknown::Release} $1 ""
    ${EndIf}
    ${IUnknown::Release} $0 ""
  ${EndIf}
!macroend

!macroundef SetLnkAppUserModelId
!macro SetLnkAppUserModelId shortcut
  StrCpy $MWShortcutPath "${shortcut}"
  !insertmacro ComHlpr_CreateInProcInstance ${CLSID_ShellLink} ${IID_IShellLink} r0 ""
  ${If} $0 P<> 0
    ${IUnknown::QueryInterface} $0 '("${IID_IPersistFile}",.r1)'
    ${If} $1 P<> 0
      ${IPersistFile::Load} $1 '("$MWShortcutPath", ${STGM_READWRITE})'
      ${IUnknown::QueryInterface} $0 '("${IID_IPropertyStore}",.r2)'
      ${If} $2 P<> 0
        System::Call 'Oleaut32::SysAllocString(w "${BUNDLEID}") i.r3'
        System::Call '*${SYSSTRUCT_PROPERTYKEY}(${PKEY_AppUserModel_ID})p.r4'
        System::Call '*${SYSSTRUCT_PROPVARIANT}(${VT_BSTR},,&i4 $3)p.r5'
        ${IPropertyStore::SetValue} $2 '($4,$5)'
        System::Call 'Oleaut32::SysFreeString($3)'
        System::Free $4
        System::Free $5
        ${IPropertyStore::Commit} $2 ""
        ${IUnknown::Release} $2 ""
        ${IPersistFile::Save} $1 '("$MWShortcutPath",1)'
      ${EndIf}
      ${IUnknown::Release} $1 ""
    ${EndIf}
    ${IUnknown::Release} $0 ""
  ${EndIf}
!macroend
