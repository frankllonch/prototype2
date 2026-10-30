/**
 * The panel of fields beside each entry.
 *
 * Plain script, no build step: it uses the editor's own libraries from the
 * `wp` global and draws one control per field named in cvEditor (set in
 * includes/editor.php). A field reads and writes its post meta directly, so
 * saving the entry saves the fields with it.
 */
( function ( wp ) {
	if ( ! wp || ! wp.plugins ) {
		return;
	}

	var config = window.cvEditor || { types: {}, pages: {} };
	var el = wp.element.createElement;
	var Panel = ( wp.editor && wp.editor.PluginDocumentSettingPanel ) || ( wp.editPost && wp.editPost.PluginDocumentSettingPanel );
	if ( ! Panel ) {
		return;
	}
	var components = wp.components;
	var useSelect = wp.data.useSelect;
	var useEntityProp = wp.coreData.useEntityProp;
	var MediaUpload = wp.blockEditor.MediaUpload;
	var MediaUploadCheck = wp.blockEditor.MediaUploadCheck;

	var sizing = { __nextHasNoMarginBottom: true, __next40pxDefaultSize: true };

	function ImageField( props ) {
		var value = props.value || 0;
		var media = useSelect(
			function ( select ) {
				return value ? select( 'core' ).getMedia( value ) : null;
			},
			[ value ]
		);
		var sizes = media && media.media_details && media.media_details.sizes;
		var preview = sizes && ( sizes.medium || sizes.thumbnail || sizes.full );

		return el(
			'div',
			{ className: 'cv-field cv-field-image', style: { marginBottom: '16px' } },
			el( 'p', { className: 'components-base-control__label', style: { marginBottom: '8px' } }, props.field.label ),
			preview
				? el( 'img', {
					src: preview.source_url,
					alt: '',
					style: { display: 'block', maxWidth: '100%', height: 'auto', marginBottom: '8px' },
				} )
				: null,
			el(
				MediaUploadCheck,
				null,
				el( MediaUpload, {
					onSelect: function ( m ) {
						props.onChange( m && m.id ? m.id : 0 );
					},
					allowedTypes: [ 'image' ],
					value: value,
					render: function ( r ) {
						return el(
							components.Button,
							{ variant: 'secondary', onClick: r.open, __next40pxDefaultSize: true },
							value ? wp.i18n.__( 'Change photograph', 'claudiavalsells' ) : wp.i18n.__( 'Choose photograph', 'claudiavalsells' )
						);
					},
				} )
			),
			value
				? el(
					components.Button,
					{
						variant: 'link',
						isDestructive: true,
						style: { marginLeft: '8px' },
						onClick: function () {
							props.onChange( 0 );
						},
					},
					wp.i18n.__( 'Remove', 'claudiavalsells' )
				)
				: null,
			props.field.help ? el( 'p', { className: 'components-base-control__help' }, props.field.help ) : null
		);
	}

	function Field( props ) {
		var field = props.field;
		var value = props.meta[ field.key ];
		var set = function ( v ) {
			var next = Object.assign( {}, props.meta );
			next[ field.key ] = v;
			props.setMeta( next );
		};

		switch ( field.type ) {
			case 'toggle':
				return el( components.ToggleControl, {
					label: field.label,
					help: field.help,
					checked: Boolean( value ),
					onChange: set,
					__nextHasNoMarginBottom: true,
				} );
			case 'number':
				return el(
					components.TextControl,
					Object.assign( {
						type: 'number',
						label: field.label,
						help: field.help,
						value: value ? String( value ) : '',
						onChange: function ( v ) {
							set( v === '' ? 0 : parseInt( v, 10 ) || 0 );
						},
					}, sizing )
				);
			case 'textarea':
				return el( components.TextareaControl, {
					label: field.label,
					help: field.help,
					value: value || '',
					rows: 4,
					onChange: set,
					__nextHasNoMarginBottom: true,
				} );
			case 'select':
				return el(
					components.SelectControl,
					Object.assign( {
						label: field.label,
						help: field.help,
						value: value || '',
						options: field.options,
						onChange: set,
					}, sizing )
				);
			case 'image':
				return el( ImageField, { field: field, value: value, onChange: set } );
			default:
				return el(
					components.TextControl,
					Object.assign( {
						label: field.label,
						help: field.help,
						value: value || '',
						onChange: set,
					}, sizing )
				);
		}
	}

	function Fields() {
		var postType = useSelect( function ( select ) {
			return select( 'core/editor' ).getCurrentPostType();
		}, [] );
		var slug = useSelect( function ( select ) {
			return select( 'core/editor' ).getEditedPostAttribute( 'slug' );
		}, [] );
		var entity = useEntityProp( 'postType', postType || 'post', 'meta' );
		var meta = entity[ 0 ];
		var setMeta = entity[ 1 ];

		var group = postType === 'page' ? config.pages[ slug ] : config.types[ postType ];
		if ( ! group || ! meta ) {
			return null;
		}

		return el(
			Panel,
			{ name: 'cv-fields', title: group.title, initialOpen: true },
			group.fields.map( function ( field ) {
				return el(
					'div',
					{ key: field.key, style: { marginBottom: '16px' } },
					el( Field, { field: field, meta: meta, setMeta: setMeta } )
				);
			} )
		);
	}

	wp.plugins.registerPlugin( 'claudiavalsells-fields', { render: Fields, icon: null } );
} )( window.wp );
