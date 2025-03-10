/*
 * AMRIT � Accessible Medical Records via Integrated Technology
 * Integrated EHR (Electronic Health Records) Solution
 *
 * Copyright (C) "Piramal Swasthya Management and Research Institute"
 *
 * This file is part of AMRIT.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/.
 */

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  DoCheck,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { CameraService } from '../../core/services/camera.service';
import { BeneficiaryDetailsService } from '../../core/services/beneficiary-details.service';
import { RegistrarService } from '../shared/services/registrar.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { SetLanguageComponent } from '../../core/components/set-language.component';
import { CommonService } from '../../core/services/common-services.service';
import { HttpServiceService } from '../../core/services/http-service.service';
import { QuickSearchComponent } from '../quick-search/quick-search.component';
import * as moment from 'moment';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { HealthIdDisplayModalComponent } from '../../core/components/health-id-display-modal/health-id-display-modal.component';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit, DoCheck {
  rowsPerPage = 5;
  activePage = 1;
  pagedList = [];
  rotate = true;
  beneficiaryList: any = [];
  filteredBeneficiaryList: any = [];
  quicksearchTerm: any;
  advanceSearchTerm: any;
  blankTable = [1, 2, 3, 4, 5];
  currentLanguageSet: any;
  externalSearchTerm: any;
  externalBeneficiaryList: any = [];
  filteredExternalBeneficiaryList: any = [];
  externalPagedList = [];
  districtList: any;
  districtID: any;
  statesList: any;
  demographicsMaster!: Location & {
    servicePointID: string;
    servicePointName: string;
  };
  masterDataSubscription: any;
  masterData: any;
  countryId = 1;
  stateID: any;
  genderID: any;
  pageNo = 1;
  searchPattern!: string;
  displayedColumns: string[] = [
    'edit',
    'beneficiaryID',
    'benName',
    'genderName',
    'age',
    'fatherName',
    'districtVillage',
    'phoneNo',
    'registeredOn',
    'abhaAddress',
    'image',
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator | null = null;
  dataSource = new MatTableDataSource<any>();

  displayedColumns1: string[] = [
    'sNo',
    'amritID',
    'healthID',
    'healthIdNumber',
    'externalID',
    'benName',
    'gender',
    'dob',
    'state',
    'district',
    'action',
  ];
  dataSourceOne = new MatTableDataSource<any>();

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dialog: MatDialog,
    private confirmationService: ConfirmationService,
    private registrarService: RegistrarService,
    private cameraService: CameraService,
    private router: Router,
    public httpServiceService: HttpServiceService,
    private beneficiaryDetailsService: BeneficiaryDetailsService,
    private commonService: CommonService,
  ) {}

  ngOnInit() {
    this.searchPattern = '/^[a-zA-Z0-9](.|@|-)*$/;';
    this.assignSelectedLanguage();
    this.stateMaster();
    this.registrarService.getRegistrationMaster(this.countryId);
  }

  ngDoCheck() {
    this.assignSelectedLanguage();
  }
  assignSelectedLanguage() {
    const getLanguageJson = new SetLanguageComponent(this.httpServiceService);
    getLanguageJson.setLanguage();
    this.currentLanguageSet = getLanguageJson.currentLanguageObject;
  }

  AfterViewChecked() {
    this.changeDetectorRef.detectChanges();
  }

  /*JA354063 - QuickSearch on BenID, phone number, ABHA Address, ABHA Number */
  searchBeneficiary(searchTerm?: string) {
    const searchObject = {
      beneficiaryRegID: null,
      beneficiaryID: null,
      phoneNo: null,
      HealthID: null,
      HealthIDNumber: null,
    };
    if (this.validateSearchItem(searchTerm, searchObject)) {
      this.externalBeneficiaryList = [];
      this.externalPagedList = [];
      this.filteredExternalBeneficiaryList = [];
      this.registrarService.identityQuickSearch(searchObject).subscribe(
        (beneficiaryList: any) => {
          if (!beneficiaryList || beneficiaryList?.length <= 0) {
            this.beneficiaryList = [];
            this.filteredBeneficiaryList = [];
            this.dataSource.data = [];
            this.dataSource.paginator = this.paginator;
            this.pagedList = [];
            this.confirmationService.alert(
              this.currentLanguageSet.alerts.info.beneNotFound,
              'info',
            );
          } else {
            this.beneficiaryList = this.searchRestruct(
              beneficiaryList,
              searchObject,
            );
            this.filteredBeneficiaryList = this.beneficiaryList;
            this.dataSource.data = this.beneficiaryList;
            this.dataSource.paginator = this.paginator;
          }
          console.log('hi', JSON.stringify(beneficiaryList, null, 4));
        },
        (error) => {
          this.confirmationService.alert(error, 'error');
        },
      );
    }
  }
  validateSearchItem(searchTerm: any, searchObject: any) {
    if (
      searchTerm === undefined ||
      searchTerm === null ||
      searchTerm.trim() === '' ||
      searchTerm.trim().length <= 0
    ) {
      this.resetWorklist();
      this.confirmationService.alert('Please enter a valid input', 'info');
      return false;
    } else {
      if (
        searchTerm !== undefined &&
        searchTerm !== null &&
        searchTerm.trim().length >= 8 &&
        searchTerm.trim().length <= 32
      ) {
        if (
          searchTerm.trim().length === 10 ||
          searchTerm.trim().length === 12
        ) {
          return this.validatePhoneNumberOrBenID(
            searchTerm.trim(),
            searchObject,
          );
        } else if (
          searchTerm.trim().length === 14 ||
          searchTerm.trim().length === 17
        ) {
          return this.checkValidHealthIDNumber(searchTerm, searchObject);
        } else {
          return this.validateHealthIDPattern(searchTerm.trim(), searchObject);
        }
      } else {
        this.resetWorklist();
        this.confirmationService.alert('Please enter a valid input', 'info');
        return false;
      }
    }
  }
  validatePhoneNumberOrBenID(searchTerm: any, searchObject: any) {
    const phoneNoPattern = /\d{10}$/;
    const verifyPhoneNoPattern = phoneNoPattern.test(searchTerm);
    if (verifyPhoneNoPattern) {
      searchObject['phoneNo'] =
        searchTerm.length === 10
          ? searchTerm
          : (searchObject['beneficiaryID'] = searchTerm);
      return true;
    } else {
      return this.validateHealthIDPattern(searchTerm, searchObject);
    }
  }
  checkValidHealthIDNumber(searchTerm: any, searchObject: any) {
    const healthidval =
      searchTerm !== undefined && searchTerm !== null
        ? searchTerm.trim()
        : searchTerm;
    if (
      searchTerm !== undefined &&
      searchTerm !== null &&
      searchTerm.trim().length === 14
    ) {
      const healthIDNumberPatternWithoutHypen = /\d{14}$/;
      return this.validateHealthIDNumberPattern(
        healthIDNumberPatternWithoutHypen,
        healthidval,
        searchObject,
      );
    } else if (healthidval.length === 17) {
      const healthIDNumberPatternWithHypen =
        /^(\d{2})-(\d{4})-(\d{4})-(\d{4})*$/;
      return this.validateHealthIDNumberPattern(
        healthIDNumberPatternWithHypen,
        healthidval,
        searchObject,
      );
    } else {
      return this.validateHealthIDPattern(searchTerm, searchObject);
    }
  }
  validateHealthIDNumberPattern(
    pattern: any,
    healthidval: any,
    searchObject: any,
  ) {
    const checkPattern = pattern.test(healthidval);
    if (checkPattern) {
      searchObject['HealthIDNumber'] =
        healthidval.length === 14
          ? healthidval.substring(0, 2) +
            '-' +
            healthidval.substring(2, 6) +
            '-' +
            healthidval.substring(6, 10) +
            '-' +
            healthidval.substring(10, healthidval.length)
          : healthidval;
      return true;
    } else {
      return this.validateHealthIDPattern(healthidval, searchObject);
    }
  }

  validateHealthIDPattern(healthidval: any, searchObject: any) {
    let healthIDPattern;
    if (environment.abhaExtension === '@abdm') {
      healthIDPattern = /^([a-zA-Z0-9])+(\.[a-zA-Z0-9]+)?@([a-zA-Z]{4})$/;
    } else {
      healthIDPattern = /^([a-zA-Z0-9])+(\.[a-zA-Z0-9]+)?@([a-zA-Z]{3})$/;
    }

    const checkPattern = healthIDPattern.test(healthidval);
    if (checkPattern) {
      searchObject['HealthID'] = healthidval;
      return true;
    } else {
      this.resetWorklist();
      this.confirmationService.alert('Please enter a valid input', 'info');
      return false;
    }
  }
  resetWorklist() {
    this.beneficiaryList = [];
    this.filteredBeneficiaryList = [];
    this.pagedList = [];
  }
  /*Ends */
  /**
   * ReStruct the response object of Identity Search to be as per search table requirements
   */
  searchRestruct(benList: any, benObject: any) {
    const requiredBenData: any = [];
    benList.data.forEach((element: any, i: any) => {
      requiredBenData.push({
        beneficiaryID: element.beneficiaryID,
        beneficiaryRegID: element.beneficiaryRegID,
        benName: `${element.firstName} ${element.lastName || ''}`,
        genderName: `${element.m_gender.genderName || 'Not Available'}`,
        fatherName: `${element.fatherName || 'Not Available'}`,
        districtName: `${
          element.i_bendemographics.districtName || 'Not Available'
        }`,
        villageName: `${
          element.i_bendemographics.districtBranchName || 'Not Available'
        }`,
        phoneNo: this.getCorrectPhoneNo(element.benPhoneMaps, benObject),
        age:
          moment(element.dOB).fromNow(true) === 'a few seconds'
            ? 'Not Available'
            : moment(element.dOB).fromNow(true),
        registeredOn: moment(element.createdDate).format('DD-MM-YYYY'),
        benObject: element,
      });
    });
    console.log(JSON.stringify(requiredBenData, null, 4), 'yoooo!');

    return requiredBenData;
  }
  getHealthIDDetails(data: any) {
    console.log('data', data);
    if (
      data.benObject !== undefined &&
      data.benObject.abhaDetails !== undefined &&
      data.benObject.abhaDetails !== null &&
      data.benObject.abhaDetails.length > 0
    ) {
      this.dialog.open(HealthIdDisplayModalComponent, {
        data: { dataList: data.benObject.abhaDetails, search: true },
      });
    } else
      this.confirmationService.alert(
        this.currentLanguageSet.abhaDetailsNotAvailable,
        'info',
      );
  }
  pageChanged(event: any) {
    console.log('called', event);
    const startItem = (event.page - 1) * event.itemsPerPage;
    const endItem = event.page * event.itemsPerPage;
    this.pagedList = this.filteredBeneficiaryList.slice(startItem, endItem);
    console.log('list', this.pagedList);
  }

  getCorrectPhoneNo(phoneMaps: any[], benObject: any): string {
    if (!phoneMaps.length) {
      return 'Not Available';
    }

    if (benObject && benObject.phoneNo) {
      for (const elem of phoneMaps) {
        if (elem.phoneNo === benObject.phoneNo) {
          return elem.phoneNo;
        }
      }
    }

    return phoneMaps[0].phoneNo;
  }

  filterBeneficiaryList(searchTerm?: string) {
    if (!searchTerm) this.filteredBeneficiaryList = this.beneficiaryList;
    else {
      this.filteredBeneficiaryList = [];
      this.dataSource.data = [];
      this.dataSource.paginator = this.paginator;
      this.beneficiaryList.forEach((item: any) => {
        for (const key in item) {
          if (key !== 'benObject') {
            const value: string = '' + item[key];
            if (value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) {
              this.filteredBeneficiaryList.push(item);
              this.dataSource.data.push(item);
              this.dataSource.paginator = this.paginator;
              this.dataSource.data.forEach(
                (sectionCount: any, index: number) => {
                  sectionCount.sno = index + 1;
                },
              );
              break;
            }
          }
        }
      });
    }
  }

  filterExternalBeneficiaryList(searchTerm?: string) {
    if (!searchTerm)
      this.filteredExternalBeneficiaryList = this.externalBeneficiaryList;
    else {
      this.filteredExternalBeneficiaryList = [];
      this.dataSource.data = [];
      this.dataSource.paginator = this.paginator;
      this.externalBeneficiaryList.forEach((item: any) => {
        for (const key in item) {
          const value: string = '' + item[key];
          if (value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) {
            this.filteredExternalBeneficiaryList.push(item);
            this.dataSource.data.push(item);
            this.dataSource.paginator = this.paginator;
            this.dataSource.data.forEach((sectionCount: any, index: number) => {
              sectionCount.sno = index + 1;
            });
            break;
          }
        }
      });
    }
  }

  patientRevisited(benObject: any) {
    if (
      benObject &&
      benObject.m_gender &&
      benObject.m_gender.genderName &&
      benObject.dOB
    ) {
      const action = false;
      console.log(JSON.stringify(benObject, null, 4), 'benObject');
      const vanID = JSON.parse(
        localStorage.getItem('serviceLineDetails') ?? '{}',
      )?.vanID;
      benObject['providerServiceMapId'] =
        localStorage.getItem('providerServiceID');
      benObject['vanID'] = vanID;
      this.confirmationService
        .confirm(
          `info`,
          this.currentLanguageSet.alerts.info.confirmSubmitBeneficiary,
        )
        .subscribe((result) => {
          if (result) this.sendToNurseWindow(result, benObject);
        });
    } else if (!benObject.m_gender.genderName && !benObject.dOB) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.genderAndAgeDetails,
        'info',
      );
    } else if (!benObject.m_gender.genderName) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.noGenderDetails,
        'info',
      );
    } else if (!benObject.dOB) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.noAgeDetailsAvail,
        'info',
      );
    }
  }

  editPatientInfo(beneficiary: any) {
    this.confirmationService
      .confirm(`info`, this.currentLanguageSet.alerts.info.editDetails)
      .subscribe((result) => {
        if (result) {
          this.registrarService.saveBeneficiaryEditDataASobservable(
            beneficiary.benObject,
          );
          this.router.navigate([
            '/registrar/search/' + beneficiary.beneficiaryID,
          ]);
        }
      });
  }

  sendToNurseWindow(userResponse: boolean, benObject: any) {
    if (userResponse) {
      this.registrarService.identityPatientRevisit(benObject).subscribe(
        (result: any) => {
          if (result.data)
            this.confirmationService.alert(
              this.currentLanguageSet.common.beneficiaryMovedtoNurse,
              'success',
            );
          else
            this.confirmationService.alert(
              this.currentLanguageSet.common.beneAlreadyAdded,
              'warn',
            );
        },
        (error) => {
          this.confirmationService.alert(error, 'error');
        },
      );
    }
  }

  patientImageView(benregID: any) {
    if (
      benregID &&
      benregID !== null &&
      benregID !== '' &&
      benregID !== undefined
    ) {
      this.beneficiaryDetailsService
        .getBeneficiaryImage(benregID)
        .subscribe((data: any) => {
          if (data && data.benImage)
            this.cameraService.viewImage(data.benImage);
          else
            this.confirmationService.alert(
              this.currentLanguageSet.alerts.info.imageNotFound,
            );
        });
    }
  }

  openSearchDialog() {
    const mdDialogRef: MatDialogRef<SearchDialogComponent> = this.dialog.open(
      SearchDialogComponent,
      {
        width: '80%',
        disableClose: false,
      },
    );

    mdDialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.clearTableContents();
        console.log('something fishy happening here', result);
        this.advanceSearchTerm = result;
        this.registrarService
          .advanceSearchIdentity(this.advanceSearchTerm)
          .subscribe(
            (beneficiaryList: any) => {
              if (!beneficiaryList || beneficiaryList.length <= 0) {
                this.beneficiaryList = [];
                this.filteredBeneficiaryList = [];
                this.dataSource.data = [];
                this.dataSource.paginator = this.paginator;
                this.quicksearchTerm = null;
                this.confirmationService.alert(
                  this.currentLanguageSet.alerts.info.beneNotFound,
                  'info',
                );
              } else {
                this.beneficiaryList = this.searchRestruct(beneficiaryList, {});
                this.filteredBeneficiaryList = this.beneficiaryList;
                this.dataSource.data = this.beneficiaryList;
                this.dataSource.paginator = this.paginator;
                this.dataSource.data.forEach(
                  (sectionCount: any, index: number) => {
                    sectionCount.sno = index + 1;
                  },
                );
              }
              console.log(JSON.stringify(beneficiaryList, null, 4));
            },
            (error) => {
              this.confirmationService.alert(error, 'error');
            },
          );
      }
    });
  }
  /* Search external beneficiary details in mongo*/
  openQuickSearch() {
    const mdDialogRef: MatDialogRef<QuickSearchComponent> = this.dialog.open(
      QuickSearchComponent,
      {
        width: '60%',
        disableClose: true,
      },
    );
    mdDialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.externalSearchTerm = result;
        this.clearTableContents();
        this.searchBeneficiaryInMongo(null);
      }
    });
  }
  searchBeneficiaryInMongo(pageNo: any) {
    if (this.externalSearchTerm.pageNo !== undefined && pageNo !== null)
      this.externalSearchTerm.pageNo = pageNo - 1;
    this.registrarService
      .externalSearchIdentity(this.externalSearchTerm)
      .subscribe(
        (externalBenList: any) => {
          if (
            externalBenList.response !== undefined &&
            externalBenList.response !== null &&
            externalBenList.response === 'patient not found'
          ) {
            this.confirmationService.alert(
              this.currentLanguageSet.alerts.info.beneNotFound,
              'info',
            );
          } else {
            if (externalBenList && externalBenList.length > 0) {
              this.externalBeneficiaryList =
                this.searchExternalRestruct(externalBenList);
              this.filteredExternalBeneficiaryList =
                this.externalBeneficiaryList;
              this.dataSource.data = this.externalBeneficiaryList;
              this.dataSource.paginator = this.paginator;
              this.dataSource.data.forEach(
                (sectionCount: any, index: number) => {
                  sectionCount.sno = index + 1;
                },
              );
            } else {
              this.externalBeneficiaryList = [];
              this.filteredExternalBeneficiaryList = [];
              this.dataSource.data = [];
              this.dataSource.paginator = this.paginator;
            }
          }
        },
        (error: any) => {
          this.externalBeneficiaryList = [];
          this.filteredExternalBeneficiaryList = [];
          this.confirmationService.alert(error, 'error');
        },
      );
  }
  searchExternalRestruct(benList: any) {
    const requiredExternalBenData: any = [];
    benList.forEach((element: any, i: any) => {
      requiredExternalBenData.push({
        amritID: element.amritId,
        healthID: element.healthId,
        healthIdNumber: element.healthIdNumber,
        externalId: element.externalId,
        benName: element.profile.patient.name,
        gender:
          element.profile.patient.gender === 'F'
            ? 'Female'
            : element.profile.patient.gender === 'M'
              ? 'Male'
              : 'Others',
        dob:
          element.profile.patient.yearOfBirth +
          '-' +
          element.profile.patient.monthOfBirth +
          '-' +
          element.profile.patient.dayOfBirth,
        state: element.profile.patient.address.state,
        district: element.profile.patient.address.district,
        village: element.profile.patient.address.village,
        benObject: element,
      });
    });

    return requiredExternalBenData;
  }
  clearTableContents() {
    this.externalBeneficiaryList = [];
    this.filteredExternalBeneficiaryList = [];
    this.externalPagedList = [];
    this.quicksearchTerm = null;
    this.beneficiaryList = [];
    this.filteredBeneficiaryList = [];
    this.pagedList = [];
    this.pageNo = 1;
  }

  pageChangedExternal(event: any) {
    console.log('called', event);
    const startItem = (event.page - 1) * event.itemsPerPage;
    const endItem = event.page * event.itemsPerPage;
    this.externalPagedList = this.filteredExternalBeneficiaryList.slice(
      startItem,
      endItem,
    );
  }
  /* Ends - Search external beneficiary details in mongo*/

  /* Update external beneficiary details in AMRIT*/
  migrateBeneficiaryToAmrit(benDetails: any) {
    this.assignStateIDAndDistrictID(benDetails);
    this.confirmationService
      .confirm(`info`, 'Please confirm to register in AMRIT')
      .subscribe((result) => {
        if (result) this.sendBenToAmrit(benDetails);
      });
  }
  stateMaster() {
    this.commonService.getStates(1).subscribe(
      (response) => {
        if (response !== undefined && response !== null) {
          this.statesList = response;
        }
      },
      (err) => {
        this.confirmationService.alert('Error in fetching states', 'error');
      },
    );
  }
  assignStateIDAndDistrictID(benDetails: any) {
    if (this.statesList !== null && this.statesList.length > 0) {
      this.statesList.forEach((element: any) => {
        if (
          element.stateName.toLowerCase() ===
          benDetails.profile.patient.address.state.toLowerCase()
        )
          this.stateID = element.stateID;
      });
      this.getDistrict(benDetails, this.stateID);
    }
    this.masterDataSubscription =
      this.registrarService.registrationMasterDetails$.subscribe((res) => {
        if (res !== null) {
          this.masterData = res;
        }
      });

    const genderMaster = this.masterData.genderMaster;
    benDetails.profile.patient.gender =
      benDetails.profile.patient.gender === 'F'
        ? 'Female'
        : benDetails.profile.patient.gender === 'M'
          ? 'Male'
          : 'Transgender';
    genderMaster.forEach((element: any) => {
      if (element.genderName === benDetails.profile.patient.gender) {
        this.genderID = element.genderID;
      }
    });
  }
  sendBenToAmrit(benDetails: any) {
    const serviceLineDetails: any = localStorage.getItem('serviceLineDetails');
    const date = new Date(
      benDetails.profile.patient.yearOfBirth +
        '-' +
        benDetails.profile.patient.monthOfBirth +
        '-' +
        benDetails.profile.patient.dayOfBirth,
    );
    const req = {
      firstName: benDetails.profile.patient.firstName,
      lastName: benDetails.profile.patient.lastName,
      dOB: date.toISOString(),
      genderName: benDetails.profile.patient.gender,
      genderID: this.genderID,
      i_bendemographics: {
        stateName: benDetails.profile.patient.address.state,
        stateID: this.stateID,
        districtName: benDetails.profile.patient.address.district,
        districtID: this.districtID,
        servicePointID: localStorage.getItem('servicePointID'),
        servicePointName: localStorage.getItem('servicePointName'),
      },
      benPhoneMaps: [
        {
          parentBenRegID: null,
          benRelationshipID: null,
          phoneNo: null,
          vanID: serviceLineDetails.vanID,
          parkingPlaceID: serviceLineDetails.parkingPlaceID,
          createdBy: localStorage.getItem('userName'),
        },
      ],
      providerServiceMapId: localStorage.getItem('providerServiceID'),
      vanID: serviceLineDetails.vanID,
      parkingPlaceID: serviceLineDetails.parkingPlaceID,
      createdBy: localStorage.getItem('userName'),
    };

    this.registrarService.submitBeneficiary(req).subscribe(
      (resp: any) => {
        if (resp && resp.statusCode === 200) {
          this.confirmationService.alert(resp.data.response, 'success');
          this.updateAmritIDInMongo(benDetails, resp.data.response);
        } else {
          this.confirmationService.alert(resp.errorMessage, 'error');
        }
      },
      (error) => {
        this.confirmationService.alert(error, 'error');
      },
    );
  }
  getDistrict(benDetails: any, stateID: any) {
    this.registrarService
      .getDistrictList(stateID)

      .subscribe((res: any) => {
        if (res && res.statusCode === 200) {
          this.districtList = res.data;
          if (this.districtList !== null && this.districtList.length > 0) {
            this.districtList.forEach((element: any) => {
              if (
                element.districtName.toLowerCase() ===
                benDetails.profile.patient.address.district.toLowerCase()
              )
                this.districtID = element.districtID;
            });
          }
        }
      });
  }
  /* Ends - Update external beneficiary details in AMRIT*/
  sendRegisteredBeneficiaryToNurse(benObject: any) {
    if (
      benObject.amritID !== null &&
      benObject.amritID !== undefined &&
      benObject.amritID !== ''
    ) {
      const serviceLineDetails: any =
        localStorage.getItem('serviceLineDetails');
      const vanID = JSON.parse(serviceLineDetails).vanID;
      benObject['providerServiceMapId'] =
        localStorage.getItem('providerServiceID');
      benObject['vanID'] = vanID;
      this.confirmationService
        .confirm(
          `info`,
          this.currentLanguageSet.alerts.info.confirmSubmitBeneficiary,
        )
        .subscribe((result) => {
          if (result) this.sendToNurseWindow(result, benObject);
        });
    } else {
      this.confirmationService.alert(
        'Please register the beneficiary in AMRIT',
        'info',
      );
    }
  }
  updateAmritIDInMongo(benDetails: any, amritId: any) {
    const benID = amritId.replace(/\D/g, '');
    const updateAmritID = {
      id: benDetails.id,
      externalId: benDetails.externalId,
      amritId: benID,
    };
    this.registrarService.updateBenDetailsInMongo(updateAmritID).subscribe(
      (updatedAmritID: any) => {
        if (updatedAmritID !== undefined && updatedAmritID !== null) {
          console.log(updatedAmritID.data.response, 'success');
          this.searchBeneficiaryInMongo(null);
        }
      },
      (err: any) => {
        console.log(err);
      },
    );
  }
  nextPage() {
    this.pageNo = this.pageNo + 1;
    if (this.externalSearchTerm.pageNo !== undefined && this.pageNo !== null)
      this.externalSearchTerm.pageNo = this.pageNo - 1;
    this.searchBeneficiaryInMongo(this.pageNo);
    this.registrarService
      .externalSearchIdentity(this.externalSearchTerm)
      .subscribe(
        (externalBenList: any) => {
          if (
            externalBenList.response !== undefined &&
            externalBenList.response !== null &&
            externalBenList.response === 'patient not found'
          ) {
            this.confirmationService.alert(
              this.currentLanguageSet.alerts.info.beneNotFound,
              'info',
            );
          } else {
            if (externalBenList && externalBenList.length > 0) {
              this.externalBeneficiaryList =
                this.searchExternalRestruct(externalBenList);
              this.filteredExternalBeneficiaryList =
                this.externalBeneficiaryList;
              this.dataSource.data = this.externalBeneficiaryList;
              this.dataSource.paginator = this.paginator;
              this.dataSource.data.forEach(
                (sectionCount: any, index: number) => {
                  sectionCount.sno = index + 1;
                },
              );
            } else {
              this.confirmationService.alert(
                'No further records to show',
                'info',
              );
              this.pageNo = this.pageNo - 1;
              this.externalBeneficiaryList = [];
              this.filteredExternalBeneficiaryList = [];
              this.dataSourceOne.data = [];
              this.dataSourceOne.paginator = this.paginator;
            }
          }
        },
        (error: any) => {
          this.pageNo = this.pageNo - 1;
          this.confirmationService.alert(error, 'error');
        },
      );
  }
  prevPage() {
    this.pageNo = this.pageNo - 1;
    this.searchBeneficiaryInMongo(this.pageNo);
  }
  navigateTORegistrar() {
    const link = '/registrar/registration';
    const currentRoute = this.router.routerState.snapshot.url;
    console.log('currentRoute', currentRoute);
    if (currentRoute !== link) {
      console.log('log in');
      if (this.beneficiaryList === undefined) {
        this.router.navigate([link]);
      } else if (this.beneficiaryList !== undefined) {
        if (this.beneficiaryList.length === 0) {
          this.router.navigate([link]);
        } else {
          this.confirmationService
            .confirm(
              `info`,
              this.currentLanguageSet.alerts.info.navigateSearchedData,
              'Yes',
              'No',
            )
            .subscribe((result) => {
              if (result) {
                this.router.navigate([link]);
              }
            });
        }
      }
    }
  }

  transferMigratedBeneficiaryToNurse(benObject: any) {
    const vanID = JSON.parse(
      localStorage.getItem('serviceLineDetails') ?? '{}',
    )?.vanID;
    benObject['providerServiceMapId'] =
      localStorage.getItem('providerServiceID');
    benObject['vanID'] = vanID;
    this.confirmationService
      .confirm(
        `info`,
        this.currentLanguageSet.alerts.info.confirmSubmitBeneficiary,
      )
      .subscribe((result) => {
        if (result) this.sendToNurseWindow(result, benObject);
      });
  }
}
