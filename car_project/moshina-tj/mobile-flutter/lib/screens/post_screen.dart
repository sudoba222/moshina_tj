import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../data/vehicle_data.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class PostScreen extends StatefulWidget {
  const PostScreen({super.key});

  @override
  State<PostScreen> createState() => _PostScreenState();
}

class _PostScreenState extends State<PostScreen> {
  int _step = 0;
  bool _submitting = false;

  // Step 1
  String _type = 'sale';
  bool _installmentAvailable = false;
  final _brandCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _yearCtrl = TextEditingController();

  // Brand/model picker state
  List<Map<String, dynamic>> _brands = [];
  List<Map<String, dynamic>> _models = [];
  bool _brandsLoading = false;

  // Step 2
  final _priceCtrl = TextEditingController();
  String _currency = 'USD';
  bool _negotiable = false;
  final _mileageCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  String _condition = 'used';

  // Step 3
  String? _fuel;
  String? _transmission;
  String? _bodyType;
  final _colorCtrl = TextEditingController();
  final _engineCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  // AI description
  bool _aiLoading = false;

  // Step 3 — Photos
  final _picker = ImagePicker();
  final List<XFile> _selectedFiles = [];
  final List<String> _uploadedUrls = [];
  final List<bool> _uploadingFlags = [];

  // Step 4
  late TextEditingController _contactCtrl;
  String _contactMethod = 'phone_and_chat';

  final _step1Key = GlobalKey<FormState>();
  final _step2Key = GlobalKey<FormState>();
  final _step4Key = GlobalKey<FormState>();

  // FocusNodes for required fields — used to focus + highlight on error
  final _brandFocus = FocusNode();
  final _modelFocus = FocusNode();
  final _yearFocus = FocusNode();
  final _priceFocus = FocusNode();
  final _cityFocus = FocusNode();
  final _contactFocus = FocusNode();

  // GlobalKeys for required fields — used by Scrollable.ensureVisible
  final _brandFieldKey = GlobalKey();
  final _modelFieldKey = GlobalKey();
  final _yearFieldKey = GlobalKey();
  final _priceFieldKey = GlobalKey();
  final _cityFieldKey = GlobalKey();
  final _contactFieldKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _contactCtrl = TextEditingController(text: user?.phone ?? '');
    _loadBrands();
  }

  // Brand names from vehicle_data.dart (used to detect static vs API brands)
  static final Set<String> _staticBrandNames = kBrandModels.keys.toSet();

  Future<void> _loadBrands() async {
    setState(() => _brandsLoading = true);
    try {
      final api = context.read<ApiService>();
      final apiBrands = await api.fetchBrands();
      if (apiBrands.isNotEmpty) {
        _brands = apiBrands;
      } else {
        _brands = kSortedBrands.map((b) => {'id': b.name, 'name': b.name, 'is_popular': false}).toList();
      }
    } catch (_) {
      _brands = kSortedBrands.map((b) => {'id': b.name, 'name': b.name, 'is_popular': false}).toList();
    }
    if (mounted) setState(() => _brandsLoading = false);
  }

  Future<void> _loadModels(String brandId) async {
    // Static brand (id == name) → use vehicle_data.dart directly
    if (_staticBrandNames.contains(brandId)) {
      final list = kBrandModels[brandId] ?? [];
      _models = list.map((m) => {'id': m, 'name': m}).toList();
      if (mounted) setState(() {});
      return;
    }
    try {
      final api = context.read<ApiService>();
      final apiModels = await api.fetchModels(brandId);
      if (apiModels.isNotEmpty) {
        _models = apiModels;
      } else {
        final brandName = _brandCtrl.text;
        final list = kBrandModels[brandName] ?? [];
        _models = list.map((m) => {'id': m, 'name': m}).toList();
      }
    } catch (_) {
      final brandName = _brandCtrl.text;
      final list = kBrandModels[brandName] ?? [];
      _models = list.map((m) => {'id': m, 'name': m}).toList();
    }
    if (mounted) setState(() {});
  }

  Future<void> _generateAiDescription() async {
    final brand = _brandCtrl.text.trim();
    final model = _modelCtrl.text.trim();
    final yearText = _yearCtrl.text.trim();
    if (brand.isEmpty || model.isEmpty || yearText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Заполните марку, модель и год для генерации описания')),
      );
      return;
    }
    final year = int.tryParse(yearText);
    if (year == null) return;

    setState(() => _aiLoading = true);
    try {
      final api = context.read<ApiService>();
      final city = _cityCtrl.text.trim();
      final price = double.tryParse(_priceCtrl.text.replaceAll(' ', ''));
      final mileage = int.tryParse(_mileageCtrl.text.replaceAll(' ', ''));
      final result = await api.refineDescription(
        brand: brand,
        model: model,
        year: year,
        city: city.isNotEmpty ? city : 'Душанбе',
        type: _type == 'sale' ? 'sale' : 'rent',
        price: price,
        currency: _currency,
        mileage: mileage,
        fuel: _fuel,
        transmission: _transmission,
        color: _colorCtrl.text.trim().isNotEmpty ? _colorCtrl.text.trim() : null,
        description: _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : null,
      );
      if (mounted && result.isNotEmpty) {
        _descCtrl.text = result;
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  void _showBrandPicker(AppColors c, String lang) {
    showModalBottomSheet(
      context: context,
      backgroundColor: c.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _BrandPickerSheet(
        brands: _brands,
        loading: _brandsLoading,
        c: c,
        onSelect: (brand) {
          Navigator.pop(ctx);
          setState(() {
            _brandCtrl.text = brand['name'] as String;
            _modelCtrl.clear();
            _models = [];
          });
          _loadModels(brand['id'] as String);
        },
      ),
    );
  }

  void _showModelPicker(AppColors c, String lang) {
    if (_models.isEmpty) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: c.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _ModelPickerSheet(
        models: _models,
        brandName: _brandCtrl.text,
        c: c,
        onSelect: (model) {
          Navigator.pop(ctx);
          setState(() => _modelCtrl.text = model['name'] as String);
        },
      ),
    );
  }

  @override
  void dispose() {
    _brandCtrl.dispose();
    _modelCtrl.dispose();
    _yearCtrl.dispose();
    _priceCtrl.dispose();
    _mileageCtrl.dispose();
    _cityCtrl.dispose();
    _colorCtrl.dispose();
    _engineCtrl.dispose();
    _descCtrl.dispose();
    _contactCtrl.dispose();
    _brandFocus.dispose();
    _modelFocus.dispose();
    _yearFocus.dispose();
    _priceFocus.dispose();
    _cityFocus.dispose();
    _contactFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final lang = context.read<LanguageProvider>().lang;
    if (!_step4Key.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(t('post.required.fields', lang)),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 2),
        ),
      );
      final v = _contactCtrl.text.trim();
      if (v.isEmpty || v.replaceAll(RegExp(r'\D'), '').length < 7) {
        _scrollToField(_contactFieldKey, _contactFocus);
      }
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = context.read<ApiService>();
      // Filter out any empty strings left by failed uploads
      final validUrls = _uploadedUrls.where((u) => u.isNotEmpty).toList();
      if (validUrls.isEmpty) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t('post.required.photo', lang)),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
        return;
      }
      final body = <String, dynamic>{
        'type': _type == 'installment' ? 'sale' : _type,
        'installment_available': _installmentAvailable,
        'brand': _brandCtrl.text.trim(),
        'model': _modelCtrl.text.trim(),
        'year': int.tryParse(_yearCtrl.text.trim()) ?? 2020,
        'price': double.tryParse(_priceCtrl.text.trim().replaceAll(' ', '')) ?? 0,
        'currency': _currency,
        'is_negotiable': _negotiable,
        'city': _cityCtrl.text.trim(),
        'condition': _condition,
        'contact_phone': _contactCtrl.text.trim().isEmpty ? null : _contactCtrl.text.trim(),
        'contact_method': _contactMethod,
        'availability': 'in_stock',
        'image_urls': validUrls,
      };
      if (_mileageCtrl.text.trim().isNotEmpty) {
        body['mileage'] = int.tryParse(_mileageCtrl.text.trim().replaceAll(' ', ''));
      }
      if (_fuel != null) body['fuel'] = _fuel;
      if (_transmission != null) body['transmission'] = _transmission;
      if (_bodyType != null) body['body_type'] = _bodyType;
      if (_colorCtrl.text.trim().isNotEmpty) body['color'] = _colorCtrl.text.trim();
      if (_engineCtrl.text.trim().isNotEmpty) body['engine_volume'] = _engineCtrl.text.trim();
      if (_descCtrl.text.trim().isNotEmpty) body['description'] = _descCtrl.text.trim();

      await api.createListing(body);
      if (mounted) _showSuccess();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSuccess() {
    final lang = context.read<LanguageProvider>().lang;
    final c = context.colors;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_outline_rounded, color: Colors.green, size: 40),
            ),
            const SizedBox(height: 16),
            Text(
              t('post.success', lang),
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: c.text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              t('post.successHint', lang),
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/profile');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: c.accent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(
                  'OK',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final auth = context.watch<AuthProvider>();

    if (!auth.isAuthenticated) {
      return _buildUnauthenticated(context, c, lang);
    }

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          t('nav.post', lang),
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text, fontSize: 18),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
      ),
      body: Column(
        children: [
          _StepIndicator(step: _step, c: c, lang: lang),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: [
                _buildStep1(c, lang),
                _buildStep2(c, lang),
                _buildPhotosStep(c, lang),
                _buildStep3(c, lang),
                _buildStep4(c, lang),
              ][_step],
            ),
          ),
          _buildNavButtons(c, lang),
        ],
      ),
    );
  }

  Widget _buildUnauthenticated(BuildContext context, AppColors c, String lang) {
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        title: Text(t('nav.post', lang),
            style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: c.accent.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.add_box_outlined, size: 40, color: c.accent),
              ),
              const SizedBox(height: 20),
              Text(
                t('post.loginRequired', lang),
                textAlign: TextAlign.center,
                style: TextStyle(color: c.text, fontWeight: FontWeight.w600, fontSize: 17),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/login'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: c.accent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(t('auth.login', lang),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep1(AppColors c, String lang) {
    return Form(
      key: _step1Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(t('post.step1', lang), c),
          const SizedBox(height: 16),
          // Type selector
          Row(
            children: [
              Expanded(child: _TypeChip(label: t('post.typeSale', lang), value: 'sale', selected: _installmentAvailable ? '__none__' : _type, onTap: (v) => setState(() { _type = v; _installmentAvailable = false; }), c: c)),
              const SizedBox(width: 8),
              Expanded(child: _TypeChip(label: t('post.typeRent', lang), value: 'rent', selected: _installmentAvailable ? '__none__' : _type, onTap: (v) => setState(() { _type = v; _installmentAvailable = false; }), c: c)),
              const SizedBox(width: 8),
              Expanded(child: _TypeChip(label: t('post.typeInstallment', lang), value: 'installment', selected: _installmentAvailable ? 'installment' : '__none__', onTap: (_) => setState(() { _type = 'sale'; _installmentAvailable = true; }), c: c)),
            ],
          ),
          const SizedBox(height: 16),
          // Brand picker field
          _PickerField(
            key: _brandFieldKey,
            focusNode: _brandFocus,
            controller: _brandCtrl,
            label: t('post.brand', lang),
            icon: Icons.directions_car_outlined,
            c: c,
            isRequired: true,
            loading: _brandsLoading,
            hasPickerList: _brands.isNotEmpty,
            onTap: _brands.isNotEmpty ? () => _showBrandPicker(c, lang) : null,
            validator: (v) => (v == null || v.trim().isEmpty) ? t('post.required.brand', lang) : null,
          ),
          const SizedBox(height: 14),
          // Model picker field
          _PickerField(
            key: _modelFieldKey,
            focusNode: _modelFocus,
            controller: _modelCtrl,
            label: t('post.model', lang),
            icon: Icons.drive_eta_outlined,
            c: c,
            isRequired: true,
            hasPickerList: _models.isNotEmpty,
            onTap: _models.isNotEmpty ? () => _showModelPicker(c, lang) : null,
            validator: (v) => (v == null || v.trim().isEmpty) ? t('post.required.model', lang) : null,
          ),
          const SizedBox(height: 14),
          _field(
            fieldKey: _yearFieldKey,
            focusNode: _yearFocus,
            controller: _yearCtrl,
            label: t('post.year', lang),
            icon: Icons.calendar_today_outlined,
            c: c,
            isRequired: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: (v) {
              final y = int.tryParse(v ?? '');
              if (y == null || y < 1900 || y > DateTime.now().year + 1) return t('post.required.year', lang);
              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStep2(AppColors c, String lang) {
    return Form(
      key: _step2Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(t('post.step2', lang), c),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _field(
                  fieldKey: _priceFieldKey,
                  focusNode: _priceFocus,
                  controller: _priceCtrl,
                  label: t('post.price', lang),
                  icon: Icons.attach_money,
                  c: c,
                  isRequired: true,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                  validator: (v) => (v == null || v.trim().isEmpty) ? t('post.required.price', lang) : null,
                ),
              ),
              const SizedBox(width: 10),
              _CurrencyToggle(currency: _currency, onChanged: (v) => setState(() => _currency = v), c: c),
            ],
          ),
          const SizedBox(height: 14),
          _SwitchRow(
            label: t('post.negotiable', lang),
            value: _negotiable,
            onChanged: (v) => setState(() => _negotiable = v),
            c: c,
          ),
          const SizedBox(height: 14),
          _field(fieldKey: _cityFieldKey, focusNode: _cityFocus, controller: _cityCtrl, label: t('post.city', lang), icon: Icons.location_city_outlined, c: c,
              isRequired: true,
              validator: (v) => (v == null || v.trim().isEmpty) ? t('post.required.city', lang) : null),
          const SizedBox(height: 14),
          _field(
            controller: _mileageCtrl,
            label: t('post.mileage', lang),
            icon: Icons.speed_outlined,
            c: c,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 14),
          // Condition
          Row(
            children: [
              Expanded(child: _TypeChip(label: t('post.conditionNew', lang), value: 'new', selected: _condition, onTap: (v) => setState(() => _condition = v), c: c)),
              const SizedBox(width: 8),
              Expanded(child: _TypeChip(label: t('post.conditionUsed', lang), value: 'used', selected: _condition, onTap: (v) => setState(() => _condition = v), c: c)),
            ],
          ),
        ],
      ),
    );
  }

  // ── Photos step ───────────────────────────────────────────────────────────

  Future<void> _pickPhoto(ImageSource source) async {
    if (_selectedFiles.length >= 10) {
      if (mounted) {
        final lang = context.read<LanguageProvider>().lang;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('post.maxPhotos', lang))),
        );
      }
      return;
    }
    try {
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
      );
      if (file == null || !mounted) return;
      final index = _selectedFiles.length;
      setState(() {
        _selectedFiles.add(file);
        _uploadedUrls.add('');
        _uploadingFlags.add(true);
      });
      try {
        final api = context.read<ApiService>();
        final url = await api.uploadImage(file);
        if (mounted) {
          setState(() {
            _uploadedUrls[index] = url;
            _uploadingFlags[index] = false;
          });
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _selectedFiles.removeAt(index);
            _uploadedUrls.removeAt(index);
            _uploadingFlags.removeAt(index);
          });
          final lang = context.read<LanguageProvider>().lang;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(t('error.generic', lang)),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick photo: $e')),
        );
      }
    }
  }

  bool get _anyUploading => _uploadingFlags.any((f) => f == true);

  void _removePhoto(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
      _uploadedUrls.removeAt(index);
      _uploadingFlags.removeAt(index);
    });
  }

  Widget _buildPhotosStep(AppColors c, String lang) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(t('post.photos', lang), c),
        const SizedBox(height: 6),
        Text(
          t('post.photoHint', lang),
          style: TextStyle(color: c.textMuted, fontSize: 13),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1,
          ),
          itemCount: _selectedFiles.length < 10
              ? _selectedFiles.length + 1
              : _selectedFiles.length,
          itemBuilder: (context, i) {
            if (i == _selectedFiles.length) {
              return _buildAddTile(c, lang);
            }
            return _buildPhotoTile(c, lang, i);
          },
        ),
      ],
    );
  }

  Widget _buildAddTile(AppColors c, String lang) {
    final disabled = _anyUploading;
    return GestureDetector(
      onTap: disabled ? null : () => _showPickerSheet(c, lang),
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: disabled ? c.border.withValues(alpha: 0.5) : c.border, width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_photo_alternate_outlined, color: disabled ? c.textMuted : c.accent, size: 32),
            const SizedBox(height: 6),
            Text(
              t('post.addPhoto', lang),
              style: TextStyle(color: disabled ? c.textMuted : c.accent, fontSize: 11, fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoTile(AppColors c, String lang, int i) {
    final isUploading = _uploadingFlags[i];
    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.file(
            File(_selectedFiles[i].path),
            fit: BoxFit.cover,
          ),
        ),
        if (i == 0)
          Positioned(
            bottom: 4,
            left: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: c.accent,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                t('post.photoMain', lang),
                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        if (isUploading)
          Container(
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            ),
          ),
        if (!isUploading)
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: () => _removePhoto(i),
              child: Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 14),
              ),
            ),
          ),
      ],
    );
  }

  void _showPickerSheet(AppColors c, String lang) {
    showModalBottomSheet(
      context: context,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Icon(Icons.photo_library_outlined, color: c.accent),
                title: Text(t('post.photoFromGallery', lang), style: TextStyle(color: c.text)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickPhoto(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: Icon(Icons.camera_alt_outlined, color: c.accent),
                title: Text(t('post.photoFromCamera', lang), style: TextStyle(color: c.text)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickPhoto(ImageSource.camera);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep3(AppColors c, String lang) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(t('post.step3', lang), c),
        const SizedBox(height: 16),
        _DropdownField(
          label: t('detail.fuel', lang),
          icon: Icons.local_gas_station_outlined,
          value: _fuel,
          items: const [
            DropdownMenuItem(value: 'Бензин', child: Text('Бензин')),
            DropdownMenuItem(value: 'Дизель', child: Text('Дизель')),
            DropdownMenuItem(value: 'Электро', child: Text('Электро')),
            DropdownMenuItem(value: 'Гибрид', child: Text('Гибрид')),
            DropdownMenuItem(value: 'Газ', child: Text('Газ')),
          ],
          onChanged: (v) => setState(() => _fuel = v),
          c: c,
        ),
        const SizedBox(height: 14),
        _DropdownField(
          label: t('detail.transmission', lang),
          icon: Icons.settings_outlined,
          value: _transmission,
          items: const [
            DropdownMenuItem(value: 'Автомат', child: Text('Автомат')),
            DropdownMenuItem(value: 'Механика', child: Text('Механика')),
            DropdownMenuItem(value: 'Вариатор', child: Text('Вариатор')),
          ],
          onChanged: (v) => setState(() => _transmission = v),
          c: c,
        ),
        const SizedBox(height: 14),
        _DropdownField(
          label: t('detail.body', lang),
          icon: Icons.directions_car_filled_outlined,
          value: _bodyType,
          items: const [
            DropdownMenuItem(value: 'sedan', child: Text('Седан')),
            DropdownMenuItem(value: 'suv', child: Text('Внедорожник')),
            DropdownMenuItem(value: 'crossover', child: Text('Кроссовер')),
            DropdownMenuItem(value: 'hatchback', child: Text('Хэтчбек')),
            DropdownMenuItem(value: 'wagon', child: Text('Универсал')),
            DropdownMenuItem(value: 'coupe', child: Text('Купе')),
            DropdownMenuItem(value: 'convertible', child: Text('Кабриолет')),
            DropdownMenuItem(value: 'pickup', child: Text('Пикап')),
            DropdownMenuItem(value: 'minivan', child: Text('Минивэн')),
            DropdownMenuItem(value: 'van', child: Text('Фургон')),
            DropdownMenuItem(value: 'bus', child: Text('Автобус')),
            DropdownMenuItem(value: 'other', child: Text('Другое')),
          ],
          onChanged: (v) => setState(() => _bodyType = v),
          c: c,
        ),
        const SizedBox(height: 14),
        _field(controller: _colorCtrl, label: t('post.color', lang), icon: Icons.palette_outlined, c: c),
        const SizedBox(height: 14),
        _field(controller: _engineCtrl, label: t('post.engine', lang), icon: Icons.engineering_outlined, c: c,
            keyboardType: const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 14),
        TextFormField(
          controller: _descCtrl,
          maxLines: 5,
          style: TextStyle(color: context.colors.text),
          decoration: InputDecoration(
            labelText: t('post.description', lang),
            labelStyle: TextStyle(color: c.textMuted),
            alignLabelWithHint: true,
            prefixIcon: Padding(
              padding: const EdgeInsets.only(bottom: 60),
              child: Icon(Icons.notes_outlined, color: c.textMuted, size: 20),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: c.border, width: 1.2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: c.accent, width: 1.8),
            ),
            filled: true,
            fillColor: c.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _aiLoading ? null : _generateAiDescription,
            icon: _aiLoading
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: c.accent),
                  )
                : const Icon(Icons.auto_awesome_outlined, size: 18),
            label: Text(
              _aiLoading ? 'Генерирую...' : 'Сгенерировать описание с AI',
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w500),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: c.accent,
              side: BorderSide(color: c.accent, width: 1.2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep4(AppColors c, String lang) {
    return Form(
      key: _step4Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(t('post.step4', lang), c),
          const SizedBox(height: 16),
          _field(
            fieldKey: _contactFieldKey,
            focusNode: _contactFocus,
            controller: _contactCtrl,
            label: t('post.contactPhone', lang),
            icon: Icons.phone_outlined,
            c: c,
            isRequired: true,
            keyboardType: TextInputType.phone,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return t('post.required.phone', lang);
              final digits = v.replaceAll(RegExp(r'\D'), '');
              if (digits.length < 7) return t('post.required.phone_format', lang);
              return null;
            },
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border, width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('post.contactMethod', lang), style: TextStyle(color: c.textMuted, fontSize: 13)),
                const SizedBox(height: 10),
                _ContactMethodRow(
                  label: t('post.contactPhoneAndChat', lang),
                  value: 'phone_and_chat',
                  selected: _contactMethod,
                  onTap: (v) => setState(() => _contactMethod = v),
                  c: c,
                ),
                const SizedBox(height: 6),
                _ContactMethodRow(
                  label: t('post.contactPhoneOnly', lang),
                  value: 'phone_only',
                  selected: _contactMethod,
                  onTap: (v) => setState(() => _contactMethod = v),
                  c: c,
                ),
                const SizedBox(height: 6),
                _ContactMethodRow(
                  label: t('post.contactChatOnly', lang),
                  value: 'chat_only',
                  selected: _contactMethod,
                  onTap: (v) => setState(() => _contactMethod = v),
                  c: c,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: c.accent.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: c.accent.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline_rounded, color: c.accent, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    t('post.moderationHint', lang),
                    style: TextStyle(color: c.accent, fontSize: 13, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavButtons(AppColors c, String lang) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: c.card,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: Row(
        children: [
          if (_step > 0) ...[
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _step--),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: c.border),
                  foregroundColor: c.text,
                  minimumSize: const Size(0, 52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(t('post.back', lang)),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _submitting ? null : _onNext,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.accent,
                minimumSize: const Size(0, 52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _submitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(
                      _step < 4 ? t('post.next', lang) : t('post.publish', lang),
                      style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _onNext() {
    final lang = context.read<LanguageProvider>().lang;
    if (_step == 0) {
      if (!_step1Key.currentState!.validate()) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t('post.required.fields', lang)),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 2),
          ),
        );
        if (_brandCtrl.text.trim().isEmpty) {
          _scrollToField(_brandFieldKey, _brandFocus);
        } else if (_modelCtrl.text.trim().isEmpty) {
          _scrollToField(_modelFieldKey, _modelFocus);
        } else {
          final y = int.tryParse(_yearCtrl.text.trim());
          if (y == null || y < 1900 || y > DateTime.now().year + 1) {
            _scrollToField(_yearFieldKey, _yearFocus);
          }
        }
        return;
      }
      setState(() => _step = 1);
    } else if (_step == 1) {
      if (!_step2Key.currentState!.validate()) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t('post.required.fields', lang)),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 2),
          ),
        );
        if (_priceCtrl.text.trim().isEmpty) {
          _scrollToField(_priceFieldKey, _priceFocus);
        } else if (_cityCtrl.text.trim().isEmpty) {
          _scrollToField(_cityFieldKey, _cityFocus);
        }
        return;
      }
      setState(() => _step = 2);
    } else if (_step == 2) {
      // Photos step — block navigation while any upload is still in progress
      if (_uploadingFlags.any((f) => f)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('post.uploading', lang))),
        );
        return;
      }
      if (_uploadedUrls.isEmpty && _selectedFiles.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t('post.required.photo', lang)),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 2),
          ),
        );
        return;
      }
      setState(() => _step = 3);
    } else if (_step == 3) {
      setState(() => _step = 4);
    } else {
      _submit();
    }
  }

  void _scrollToField(GlobalKey key, FocusNode focusNode) {
    focusNode.requestFocus();
    final ctx = key.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
        alignment: 0.3,
      );
    }
  }

  Widget _field({
    Key? fieldKey,
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required AppColors c,
    bool isRequired = false,
    FocusNode? focusNode,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    final labelWidget = isRequired
        ? RichText(
            text: TextSpan(
              text: label,
              style: TextStyle(color: c.textMuted, fontSize: 14),
              children: const [
                TextSpan(
                  text: ' *',
                  style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          )
        : null;
    return TextFormField(
      key: fieldKey,
      focusNode: focusNode,
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      style: TextStyle(color: c.text),
      validator: validator,
      decoration: InputDecoration(
        label: labelWidget,
        labelText: isRequired ? null : label,
        labelStyle: TextStyle(color: c.textMuted),
        prefixIcon: Icon(icon, color: c.textMuted, size: 20),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.accent, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.red, width: 1.2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.red, width: 1.8),
        ),
        filled: true,
        fillColor: c.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );
  }

  Widget _sectionTitle(String title, AppColors c) {
    return Text(
      title,
      style: GoogleFonts.outfit(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: c.text,
        letterSpacing: -0.3,
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  final int step;
  final AppColors c;
  final String lang;

  const _StepIndicator({required this.step, required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    final steps = [
      t('post.step1', lang),
      t('post.step2', lang),
      t('post.photos', lang),
      t('post.step3', lang),
      t('post.step4', lang),
    ];
    return Container(
      color: c.card,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: List.generate(steps.length, (i) {
          final active = i == step;
          final done = i < step;
          return Expanded(
            child: Row(
              children: [
                Column(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: active || done ? c.accent : c.border,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                            : Text(
                                '${i + 1}',
                                style: TextStyle(
                                  color: active ? Colors.white : c.textMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    SizedBox(
                      width: 52,
                      child: Text(
                        steps[i],
                        style: TextStyle(
                          fontSize: 9,
                          color: active ? c.accent : c.textMuted,
                          fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                if (i < steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 1.5,
                      margin: const EdgeInsets.only(bottom: 16),
                      color: i < step ? c.accent : c.border,
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  final AppColors c;

  const _TypeChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? c.accent : c.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? c.accent : c.border, width: 1.2),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected ? Colors.white : c.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _CurrencyToggle extends StatelessWidget {
  final String currency;
  final ValueChanged<String> onChanged;
  final AppColors c;

  const _CurrencyToggle({required this.currency, required this.onChanged, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: c.border, width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: ['USD', 'TJS'].map((cur) {
          final sel = cur == currency;
          return GestureDetector(
            onTap: () => onChanged(cur),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: BoxDecoration(
                color: sel ? c.accent : Colors.transparent,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Text(
                cur,
                style: TextStyle(
                  color: sel ? Colors.white : c.textSecondary,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final AppColors c;

  const _SwitchRow({
    required this.label,
    required this.value,
    required this.onChanged,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border, width: 1.2),
      ),
      child: Row(
        children: [
          Icon(Icons.handshake_outlined, color: c.textMuted, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: TextStyle(color: c.text, fontSize: 15))),
          Switch(
            value: value,
            activeThumbColor: c.accent,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

class _DropdownField extends StatelessWidget {
  final String label;
  final IconData icon;
  final String? value;
  final List<DropdownMenuItem<String>> items;
  final ValueChanged<String?> onChanged;
  final AppColors c;

  const _DropdownField({
    required this.label,
    required this.icon,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      items: items,
      onChanged: onChanged,
      style: TextStyle(color: c.text, fontSize: 15),
      dropdownColor: c.card,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: c.textMuted),
        prefixIcon: Icon(icon, color: c.textMuted, size: 20),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.accent, width: 1.8),
        ),
        filled: true,
        fillColor: c.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );
  }
}

class _PickerField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final AppColors c;
  final bool isRequired;
  final bool loading;
  final bool hasPickerList;
  final VoidCallback? onTap;
  final String? Function(String?)? validator;
  final FocusNode? focusNode;

  const _PickerField({
    super.key,
    required this.controller,
    required this.label,
    required this.icon,
    required this.c,
    this.isRequired = false,
    this.loading = false,
    this.hasPickerList = false,
    this.onTap,
    this.validator,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    final labelWidget = isRequired
        ? RichText(
            text: TextSpan(
              text: label,
              style: TextStyle(color: c.textMuted, fontSize: 14),
              children: const [TextSpan(text: ' *', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))],
            ),
          )
        : null;

    final field = TextFormField(
      focusNode: focusNode,
      controller: controller,
      readOnly: hasPickerList,
      style: TextStyle(color: c.text),
      validator: validator,
      decoration: InputDecoration(
        label: labelWidget,
        labelText: isRequired ? null : label,
        labelStyle: TextStyle(color: c.textMuted),
        prefixIcon: loading
            ? Padding(padding: const EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: c.textMuted)))
            : Icon(icon, color: c.textMuted, size: 20),
        suffixIcon: hasPickerList ? Icon(Icons.keyboard_arrow_down_rounded, color: c.textMuted) : null,
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.border, width: 1.2)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.accent, width: 1.8)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Colors.red, width: 1.2)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Colors.red, width: 1.8)),
        filled: true,
        fillColor: c.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );

    if (hasPickerList && onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: AbsorbPointer(child: field),
      );
    }
    return field;
  }
}

class _BrandPickerSheet extends StatefulWidget {
  final List<Map<String, dynamic>> brands;
  final bool loading;
  final AppColors c;
  final ValueChanged<Map<String, dynamic>> onSelect;

  const _BrandPickerSheet({required this.brands, required this.loading, required this.c, required this.onSelect});

  @override
  State<_BrandPickerSheet> createState() => _BrandPickerSheetState();
}

class _BrandPickerSheetState extends State<_BrandPickerSheet> {
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.brands;
    _searchCtrl.addListener(_filter);
  }

  void _filter() {
    final q = _searchCtrl.text.toLowerCase();
    setState(() => _filtered = q.isEmpty
        ? widget.brands
        : widget.brands.where((b) => (b['name'] as String).toLowerCase().contains(q)).toList());
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      expand: false,
      builder: (ctx, scroll) => Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40, height: 4,
            decoration: BoxDecoration(color: c.border, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              style: TextStyle(color: c.text),
              decoration: InputDecoration(
                hintText: 'Поиск марки...',
                hintStyle: TextStyle(color: c.textMuted),
                prefixIcon: Icon(Icons.search, color: c.textMuted, size: 20),
                filled: true,
                fillColor: c.surface,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              controller: scroll,
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final brand = _filtered[i];
                final isPopular = brand['is_popular'] == true;
                return ListTile(
                  title: Text(brand['name'] as String, style: TextStyle(color: c.text, fontWeight: isPopular ? FontWeight.w600 : FontWeight.w400)),
                  trailing: isPopular ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: c.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                    child: Text('Топ', style: TextStyle(color: c.accent, fontSize: 11, fontWeight: FontWeight.w600)),
                  ) : null,
                  onTap: () => widget.onSelect(brand),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ModelPickerSheet extends StatefulWidget {
  final List<Map<String, dynamic>> models;
  final String brandName;
  final AppColors c;
  final ValueChanged<Map<String, dynamic>> onSelect;

  const _ModelPickerSheet({required this.models, required this.brandName, required this.c, required this.onSelect});

  @override
  State<_ModelPickerSheet> createState() => _ModelPickerSheetState();
}

class _ModelPickerSheetState extends State<_ModelPickerSheet> {
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.models;
    _searchCtrl.addListener(_filter);
  }

  void _filter() {
    final q = _searchCtrl.text.toLowerCase();
    setState(() => _filtered = q.isEmpty
        ? widget.models
        : widget.models.where((m) => (m['name'] as String).toLowerCase().contains(q)).toList());
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.95,
      minChildSize: 0.3,
      expand: false,
      builder: (ctx, scroll) => Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40, height: 4,
            decoration: BoxDecoration(color: c.border, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Text(widget.brandName, style: TextStyle(color: c.text, fontSize: 17, fontWeight: FontWeight.w700)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              style: TextStyle(color: c.text),
              decoration: InputDecoration(
                hintText: 'Поиск модели...',
                hintStyle: TextStyle(color: c.textMuted),
                prefixIcon: Icon(Icons.search, color: c.textMuted, size: 20),
                filled: true,
                fillColor: c.surface,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              controller: scroll,
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final model = _filtered[i];
                return ListTile(
                  title: Text(model['name'] as String, style: TextStyle(color: c.text)),
                  onTap: () => widget.onSelect(model),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactMethodRow extends StatelessWidget {
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  final AppColors c;

  const _ContactMethodRow({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected ? c.accent : c.border,
                width: isSelected ? 2 : 1.5,
              ),
            ),
            child: isSelected
                ? Center(
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: c.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: c.text, fontSize: 14)),
        ],
      ),
    );
  }
}
